/*
 * Camada de aplicação para registrar uma partida de tênis em andamento.
 *
 * Trabalha exclusivamente contra o schema existente (matches, sets,
 * stat_events) via cliente Supabase — nenhuma estrutura de banco é criada.
 * Estatísticas agregadas ficam a cargo da view match_stats_summary.
 *
 * As escritas não são transacionais (supabase-js não expõe transações), por
 * isso cada passo grava valores recalculados a partir do estado lido e
 * registerPoint reaplica conclusões pendentes de game/set/partida caso uma
 * execução anterior tenha sido interrompida no meio.
 */

import { supabase } from '../lib/supabaseClient';
import type {
  MatchRow,
  Outcome,
  SetRow,
  SetUpdate,
  Side,
  StatEventRow,
  Stroke,
} from '../types/database';
import {
  computePointWinner,
  computeSetWinner,
  gameDisplay,
  isBreakPoint,
  isTiebreakGame,
  opposite,
  scoreGame,
  setsToWin,
  type GameDisplay,
  type GameMode,
  type GameScore,
} from './scoring';

const DEFAULT_MATCH_TIEBREAK_POINTS = 10;

const SIDES: readonly Side[] = ['player', 'opponent'];
const STROKES: readonly Stroke[] = ['saque', 'forehand', 'backhand', 'voleio', 'smash'];
const OUTCOMES: readonly Outcome[] = [
  'ace',
  'dupla_falta',
  'winner',
  'erro_nao_forcado',
  'erro_forcado',
  'ponto_ganho',
  'ponto_perdido',
];

export interface PointEventInput {
  server: Side;
  stroke: Stroke;
  outcome: Outcome;
}

export interface SetScore {
  setNumber: number;
  playerGames: number;
  opponentGames: number;
  tiebreak: { playerPoints: number; opponentPoints: number } | null;
  /* true quando o set é o decisivo jogado como match tiebreak de 10 pontos:
   * o placar relevante é o de `tiebreak`, não o de games. */
  isMatchTiebreak: boolean;
  winner: Side | null;
}

export interface MatchState {
  matchId: string;
  status: MatchRow['status'];
  bestOf: number;
  opponentName: string;
  /* Regras efetivas lidas de matches (null nas colunas vale como padrão). */
  rules: {
    noAd: boolean;
    finalSetMatchTiebreak: boolean;
    matchTiebreakPointsTo: number;
  };
  sets: SetScore[];
  setsWon: { player: number; opponent: number };
  currentSet: {
    setNumber: number;
    playerGames: number;
    opponentGames: number;
    isTiebreak: boolean;
    isMatchTiebreak: boolean;
  } | null;
  currentGame: {
    gameNumber: number;
    isTiebreak: boolean;
    isMatchTiebreak: boolean;
    playerPoints: number;
    opponentPoints: number;
    display: GameDisplay;
    winner: Side | null;
  } | null;
}

export interface RegisterPointResult {
  pointWinner: Side;
  gameCompleted: boolean;
  gameWinner: Side | null;
  setCompleted: boolean;
  setWinner: Side | null;
  matchCompleted: boolean;
  state: MatchState;
}

/*
 * Cria a partida com status 'in_progress' e o set 1 zerado.
 * owner_id vem da sessão autenticada do cliente Supabase.
 */
export interface MatchRulesInput {
  /* Game comum sem vantagem: em 40-40 o próximo ponto fecha o game. */
  noAd?: boolean;
  /* Set decisivo jogado como um único match tiebreak. */
  finalSetMatchTiebreak?: boolean;
  /* Alvo de pontos do match tiebreak (ex.: 10 ou 7). */
  matchTiebreakPointsTo?: number;
}

export async function startMatch(
  playerId: string,
  opponentName: string,
  bestOf: 3 | 5,
  location: string | null = null,
  rules: MatchRulesInput = {}
): Promise<{ match: MatchRow; set: SetRow }> {
  if (bestOf !== 3 && bestOf !== 5) {
    throw new Error(`best_of deve ser 3 ou 5; recebido ${String(bestOf)}.`);
  }
  if (!playerId) throw new Error('playerId é obrigatório.');
  if (!opponentName.trim()) throw new Error('opponentName é obrigatório.');
  if (
    rules.matchTiebreakPointsTo !== undefined &&
    (!Number.isInteger(rules.matchTiebreakPointsTo) || rules.matchTiebreakPointsTo < 2)
  ) {
    throw new Error(
      `matchTiebreakPointsTo deve ser um inteiro >= 2; recebido ${String(rules.matchTiebreakPointsTo)}.`
    );
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new Error(
      'Usuário não autenticado: faça login antes de iniciar uma partida.'
    );
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      owner_id: auth.user.id,
      player_id: playerId,
      opponent_name: opponentName.trim(),
      match_date: new Date().toISOString(),
      location,
      best_of: bestOf,
      status: 'in_progress',
      // Regras omitidas quando não informadas, para valer o default da coluna.
      ...(rules.noAd !== undefined && { no_ad: rules.noAd }),
      ...(rules.finalSetMatchTiebreak !== undefined && {
        final_set_match_tiebreak: rules.finalSetMatchTiebreak,
      }),
      ...(rules.matchTiebreakPointsTo !== undefined && {
        match_tiebreak_points_to: rules.matchTiebreakPointsTo,
      }),
    })
    .select()
    .single();
  if (matchError) {
    throw new Error(`Falha ao criar a partida: ${matchError.message}`);
  }

  const set = await insertSet(match.id, 1);
  return { match, set };
}

/*
 * Registra o evento decisivo de um ponto (uma linha em stat_events) e aplica a
 * progressão de placar: game -> games do set -> winner do set -> próximo set
 * ou encerramento da partida, conforme o best_of.
 *
 * set_number, game_number e point_number são derivados do estado atual no
 * banco; o chamador informa apenas os dados do ponto em si.
 */
export async function registerPoint(
  matchId: string,
  eventData: PointEventInput
): Promise<RegisterPointResult> {
  assertOneOf(eventData.server, SIDES, 'server');
  assertOneOf(eventData.stroke, STROKES, 'stroke');
  assertOneOf(eventData.outcome, OUTCOMES, 'outcome');

  let ctx = await loadTurnContext(matchId);

  // Uma execução anterior pode ter gravado o ponto que fechou o game e caído
  // antes de atualizar sets/matches: conclui o pendente e recarrega.
  if (ctx.priorScore.winner) {
    await applyGameCompletion(ctx.match, ctx.sets, ctx.currentSet, ctx.priorScore, ctx.mode);
    ctx = await loadTurnContext(matchId);
    if (ctx.priorScore.winner) {
      throw new Error(
        'Estado inconsistente: o game vigente já está concluído em stat_events.'
      );
    }
  }

  const pointWinner = computePointWinner(eventData.server, eventData.outcome);
  // Break point derivado do placar anterior ao ponto; convertido quando quem
  // recebia o saque venceu o ponto. A UI não informa esses flags.
  const breakPoint = isBreakPoint(ctx.priorScore, ctx.mode, eventData.server);
  const breakPointWon = breakPoint
    ? pointWinner === opposite(eventData.server)
    : null;

  const { error: insertError } = await supabase.from('stat_events').insert({
    match_id: matchId,
    set_number: ctx.currentSet.set_number,
    game_number: ctx.gameNumber,
    point_number: ctx.nextPointNumber,
    server: eventData.server,
    stroke: eventData.stroke,
    outcome: eventData.outcome,
    is_break_point: breakPoint,
    break_point_won: breakPointWon,
  });
  if (insertError) {
    throw new Error(`Falha ao registrar o ponto: ${insertError.message}`);
  }

  const game = scoreGame([...ctx.priorWinners, pointWinner], ctx.mode);

  let completion: GameCompletionResult = { setWinner: null, matchCompleted: false };
  if (game.winner) {
    completion = await applyGameCompletion(
      ctx.match,
      ctx.sets,
      ctx.currentSet,
      game,
      ctx.mode
    );
  } else if (ctx.mode.kind !== 'game') {
    // Mantém a parcial do tiebreak (comum ou match tiebreak) na linha do set
    // para exibição em tempo real.
    await updateSet(ctx.currentSet.id, {
      tiebreak_player_points: game.playerPoints,
      tiebreak_opponent_points: game.opponentPoints,
    });
  }

  return {
    pointWinner,
    gameCompleted: game.winner !== null,
    gameWinner: game.winner,
    setCompleted: completion.setWinner !== null,
    setWinner: completion.setWinner,
    matchCompleted: completion.matchCompleted,
    state: await getMatchState(matchId),
  };
}

/*
 * Estado atual da partida para exibição em tempo real: placar de sets, games
 * do set vigente e pontos do game vigente (0/15/30/40/Ad ou parcial do
 * tiebreak). Para partida concluída, currentSet e currentGame são null.
 */
export async function getMatchState(matchId: string): Promise<MatchState> {
  const match = await fetchMatch(matchId);
  const sets = await fetchSets(matchId);

  const setScores: SetScore[] = sets.map((set) => ({
    setNumber: set.set_number,
    playerGames: set.player_games,
    opponentGames: set.opponent_games,
    tiebreak:
      set.tiebreak_player_points !== null || set.tiebreak_opponent_points !== null
        ? {
            playerPoints: set.tiebreak_player_points ?? 0,
            opponentPoints: set.tiebreak_opponent_points ?? 0,
          }
        : null,
    isMatchTiebreak: isMatchTiebreakSet(match, set.set_number),
    winner: set.winner,
  }));

  const setsWon = {
    player: sets.filter((set) => set.winner === 'player').length,
    opponent: sets.filter((set) => set.winner === 'opponent').length,
  };

  const base: MatchState = {
    matchId: match.id,
    status: match.status,
    bestOf: match.best_of,
    opponentName: match.opponent_name,
    rules: {
      noAd: match.no_ad === true,
      finalSetMatchTiebreak: match.final_set_match_tiebreak === true,
      // Sem a validação de matchTiebreakTarget: aqui é só informativo e não
      // deve derrubar a exibição de uma partida com a coluna fora do esperado.
      matchTiebreakPointsTo:
        match.match_tiebreak_points_to ?? DEFAULT_MATCH_TIEBREAK_POINTS,
    },
    sets: setScores,
    setsWon,
    currentSet: null,
    currentGame: null,
  };

  if (match.status !== 'in_progress') return base;

  const currentSet = sets.filter((set) => set.winner === null).at(-1);
  if (!currentSet) return base;

  const mode = gameModeFor(match, currentSet);
  const gameNumber = currentSet.player_games + currentSet.opponent_games + 1;
  const events = await fetchGameEvents(matchId, currentSet.set_number, gameNumber);
  const game = scoreGame(
    events.map((event) => computePointWinner(event.server, event.outcome)),
    mode
  );

  return {
    ...base,
    currentSet: {
      setNumber: currentSet.set_number,
      playerGames: currentSet.player_games,
      opponentGames: currentSet.opponent_games,
      isTiebreak: mode.kind === 'tiebreak',
      isMatchTiebreak: mode.kind === 'match_tiebreak',
    },
    currentGame: {
      gameNumber,
      isTiebreak: mode.kind === 'tiebreak',
      isMatchTiebreak: mode.kind === 'match_tiebreak',
      playerPoints: game.playerPoints,
      opponentPoints: game.opponentPoints,
      display: gameDisplay(game, mode),
      winner: game.winner,
    },
  };
}

/*
 * O set decisivo (set_number igual a best_of) vira um único match tiebreak
 * quando matches.final_set_match_tiebreak = true; null é tratado como false.
 */
function isMatchTiebreakSet(match: MatchRow, setNumber: number): boolean {
  return match.final_set_match_tiebreak === true && setNumber === match.best_of;
}

/* Alvo do match tiebreak: matches.match_tiebreak_points_to, ou 10 se null. */
function matchTiebreakTarget(match: MatchRow): number {
  const target = match.match_tiebreak_points_to ?? DEFAULT_MATCH_TIEBREAK_POINTS;
  if (!Number.isInteger(target) || target < 2) {
    throw new Error(
      `Valor inválido em match_tiebreak_points_to: ${String(target)}. Esperado inteiro >= 2.`
    );
  }
  return target;
}

/* Regras da partida lidas de matches; nunca assume o padrão sem consultar. */
function gameModeFor(match: MatchRow, set: SetRow): GameMode {
  if (isMatchTiebreakSet(match, set.set_number)) {
    return { kind: 'match_tiebreak', pointsTo: matchTiebreakTarget(match) };
  }
  if (isTiebreakGame(set.player_games, set.opponent_games)) {
    return { kind: 'tiebreak' };
  }
  return { kind: 'game', noAd: match.no_ad === true };
}

interface TurnContext {
  match: MatchRow;
  sets: SetRow[];
  currentSet: SetRow;
  mode: GameMode;
  gameNumber: number;
  priorWinners: Side[];
  priorScore: GameScore;
  nextPointNumber: number;
}

async function loadTurnContext(matchId: string): Promise<TurnContext> {
  const match = await fetchMatch(matchId);
  if (match.status !== 'in_progress') {
    throw new Error('A partida já foi encerrada; não é possível registrar pontos.');
  }

  const sets = await fetchSets(matchId);
  const currentSet = await ensureOpenSet(match, sets);
  const mode = gameModeFor(match, currentSet);
  // No match tiebreak os games ficam 0-0 enquanto o set está aberto, então a
  // fórmula resulta em 1: o set inteiro é o game 1.
  const gameNumber = currentSet.player_games + currentSet.opponent_games + 1;

  const events = await fetchGameEvents(matchId, currentSet.set_number, gameNumber);
  const priorWinners = events.map((event) =>
    computePointWinner(event.server, event.outcome)
  );

  return {
    match,
    sets,
    currentSet,
    mode,
    gameNumber,
    priorWinners,
    priorScore: scoreGame(priorWinners, mode),
    nextPointNumber:
      events.length === 0
        ? 1
        : Math.max(...events.map((event) => event.point_number)) + 1,
  };
}

/*
 * Retorna o set em aberto. Se não houver (execução anterior interrompida entre
 * fechar um set e criar o próximo), decide a partida ou cria o set seguinte.
 */
async function ensureOpenSet(match: MatchRow, sets: SetRow[]): Promise<SetRow> {
  const open = sets.filter((set) => set.winner === null).at(-1);
  if (open) return open;

  const lastSet = sets.at(-1);
  if (!lastSet) {
    return insertSet(match.id, 1);
  }

  const needed = setsToWin(match.best_of);
  const playerSets = sets.filter((set) => set.winner === 'player').length;
  const opponentSets = sets.filter((set) => set.winner === 'opponent').length;
  if (playerSets >= needed || opponentSets >= needed) {
    await completeMatch(match.id);
    throw new Error('A partida já foi decidida; não é possível registrar pontos.');
  }

  return insertSet(match.id, lastSet.set_number + 1);
}

interface GameCompletionResult {
  setWinner: Side | null;
  matchCompleted: boolean;
}

/*
 * Aplica o resultado de um game concluído: incrementa os games do set (no
 * tiebreak também grava a parcial final), fecha o set quando for o caso e,
 * então, encerra a partida ou abre o próximo set.
 *
 * Representação do match tiebreak nas colunas existentes de sets: o set
 * decisivo é gravado como 1-0 em player_games/opponent_games e a pontuação
 * real (ex.: 10-8) fica em tiebreak_player_points/tiebreak_opponent_points.
 * É a convenção usual de súmula — "1-0 (10-8)" — e mantém coerência com o
 * set comum, onde as colunas tiebreak_* já guardam pontos de tiebreak e o
 * vencedor do set sempre tem mais games; nenhuma coluna nova é necessária.
 */
async function applyGameCompletion(
  match: MatchRow,
  allSets: SetRow[],
  currentSet: SetRow,
  game: GameScore,
  mode: GameMode
): Promise<GameCompletionResult> {
  const gameWinner = game.winner;
  if (!gameWinner) {
    throw new Error('applyGameCompletion chamado para game não concluído.');
  }

  let playerGames: number;
  let opponentGames: number;
  let setWinner: Side | null;
  if (mode.kind === 'match_tiebreak') {
    // O match tiebreak vale o set inteiro: quem o vence fecha o set "1-0".
    playerGames = gameWinner === 'player' ? 1 : 0;
    opponentGames = gameWinner === 'opponent' ? 1 : 0;
    setWinner = gameWinner;
  } else {
    playerGames = currentSet.player_games + (gameWinner === 'player' ? 1 : 0);
    opponentGames = currentSet.opponent_games + (gameWinner === 'opponent' ? 1 : 0);
    // No tiebreak quem vence o game vence o set (7-6); fora dele vale a regra
    // de 6 games com 2 de diferença ou 7-5.
    setWinner =
      mode.kind === 'tiebreak'
        ? gameWinner
        : computeSetWinner(playerGames, opponentGames);
  }

  const update: SetUpdate = {
    player_games: playerGames,
    opponent_games: opponentGames,
  };
  if (mode.kind !== 'game') {
    update.tiebreak_player_points = game.playerPoints;
    update.tiebreak_opponent_points = game.opponentPoints;
  }
  if (setWinner) {
    update.winner = setWinner;
  }
  await updateSet(currentSet.id, update);

  if (!setWinner) {
    return { setWinner: null, matchCompleted: false };
  }

  const needed = setsToWin(match.best_of);
  const wonBy = (side: Side): number =>
    allSets.filter((set) => set.id !== currentSet.id && set.winner === side).length +
    (setWinner === side ? 1 : 0);

  if (wonBy('player') >= needed || wonBy('opponent') >= needed) {
    await completeMatch(match.id);
    return { setWinner, matchCompleted: true };
  }

  await insertSet(match.id, currentSet.set_number + 1);
  return { setWinner, matchCompleted: false };
}

async function fetchMatch(matchId: string): Promise<MatchRow> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  if (error) {
    throw new Error(`Falha ao carregar a partida ${matchId}: ${error.message}`);
  }
  return data;
}

async function fetchSets(matchId: string): Promise<SetRow[]> {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number', { ascending: true });
  if (error) {
    throw new Error(`Falha ao carregar os sets da partida: ${error.message}`);
  }
  return data;
}

async function fetchGameEvents(
  matchId: string,
  setNumber: number,
  gameNumber: number
): Promise<StatEventRow[]> {
  const { data, error } = await supabase
    .from('stat_events')
    .select('*')
    .eq('match_id', matchId)
    .eq('set_number', setNumber)
    .eq('game_number', gameNumber)
    .order('point_number', { ascending: true });
  if (error) {
    throw new Error(`Falha ao carregar os pontos do game: ${error.message}`);
  }
  return data;
}

async function insertSet(matchId: string, setNumber: number): Promise<SetRow> {
  const { data, error } = await supabase
    .from('sets')
    .insert({
      match_id: matchId,
      set_number: setNumber,
      player_games: 0,
      opponent_games: 0,
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Falha ao criar o set ${setNumber}: ${error.message}`);
  }
  return data;
}

async function updateSet(setId: string, update: SetUpdate): Promise<void> {
  const { error } = await supabase.from('sets').update(update).eq('id', setId);
  if (error) {
    throw new Error(`Falha ao atualizar o set: ${error.message}`);
  }
}

async function completeMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ status: 'completed' })
    .eq('id', matchId);
  if (error) {
    throw new Error(`Falha ao encerrar a partida: ${error.message}`);
  }
}

function assertOneOf<T extends string>(
  value: T,
  allowed: readonly T[],
  field: string
): void {
  if (!allowed.includes(value)) {
    throw new Error(
      `Valor inválido para ${field}: ${String(value)}. Permitidos: ${allowed.join(', ')}.`
    );
  }
}
