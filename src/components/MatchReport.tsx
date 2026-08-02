import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getMatchStats, type MatchStatsSummaryRow } from '../services/statsService';
import type { Tables } from '../types/supabase';

type MatchRow = Tables<'matches'>;
type SetRow = Tables<'sets'>;

type MatchContext = Pick<MatchRow, 'opponent_name' | 'match_date'>;

type SetContext = Pick<
  SetRow,
  | 'set_number'
  | 'player_games'
  | 'opponent_games'
  | 'tiebreak_player_points'
  | 'tiebreak_opponent_points'
  | 'winner'
>;

interface MatchReportData {
  stats: MatchStatsSummaryRow;
  match: MatchContext;
  sets: SetContext[];
}

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
});

export default function MatchReport({ matchId }: { matchId: string }) {
  const [report, setReport] = useState<MatchReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setReport(null);

    void Promise.all([getMatchStats(matchId), getMatchContext(matchId)])
      .then(([stats, context]) => {
        if (!cancelled) {
          setReport({ stats, ...context });
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Não foi possível carregar o relatório da partida.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" style={styles.message}>
        Carregando relatório da partida…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div role="alert" style={{ ...styles.message, ...styles.error }}>
        {error ?? 'Relatório da partida indisponível.'}
      </div>
    );
  }

  const { match, sets, stats } = report;
  const playerSets = sets.filter((set) => set.winner === 'player').length;
  const opponentSets = sets.filter((set) => set.winner === 'opponent').length;

  return (
    <article aria-label="Relatório da partida" style={styles.report}>
      <header style={styles.header}>
        <p style={styles.eyebrow}>Relatório da partida</p>
        <h1 style={styles.title}>
          Você {playerSets} × {opponentSets} {match.opponent_name}
        </h1>
        <p style={styles.date}>{formatDate(match.match_date)}</p>

        <ol aria-label="Placar por set" style={styles.setList}>
          {sets.map((set) => (
            <li key={set.set_number} style={styles.setScore}>
              <span style={styles.setLabel}>Set {set.set_number}</span>
              <strong>
                {set.player_games}–{set.opponent_games}
                {formatTiebreak(set)}
              </strong>
            </li>
          ))}
        </ol>
      </header>

      <Section title="Saque">
        <StatGrid>
          <Stat label="Aces" value={stats.aces ?? 0} />
          <Stat label="Duplas faltas" value={stats.duplas_faltas ?? 0} />
          <Stat
            label="% de primeiro saque"
            value={formatPercentOrUnavailable(stats.pct_primeiro_saque)}
          />
          {stats.pct_pontos_ganhos_primeiro_saque !== null && (
            <Stat
              label="Pontos ganhos no primeiro saque"
              value={percentFormatter.format(
                stats.pct_pontos_ganhos_primeiro_saque
              )}
            />
          )}
          {stats.pct_pontos_ganhos_segundo_saque !== null && (
            <Stat
              label="Pontos ganhos no segundo saque"
              value={percentFormatter.format(
                stats.pct_pontos_ganhos_segundo_saque
              )}
            />
          )}
        </StatGrid>
      </Section>

      <Section title="Winners e erros">
        <StrokeStats
          title="Winners"
          total={stats.winners_total ?? 0}
          forehand={stats.winners_forehand ?? 0}
          backhand={stats.winners_backhand ?? 0}
          volley={stats.winners_voleio ?? 0}
          smash={stats.winners_smash ?? 0}
        />
        <StrokeStats
          title="Erros não forçados"
          total={stats.erros_nao_forcados_total ?? 0}
          forehand={stats.erros_nao_forcados_forehand ?? 0}
          backhand={stats.erros_nao_forcados_backhand ?? 0}
          volley={stats.erros_nao_forcados_voleio ?? 0}
          smash={stats.erros_nao_forcados_smash ?? 0}
        />
        <StrokeStats
          title="Erros forçados"
          total={stats.erros_forcados_total ?? 0}
          forehand={stats.erros_forcados_forehand ?? 0}
          backhand={stats.erros_forcados_backhand ?? 0}
          volley={stats.erros_forcados_voleio ?? 0}
          smash={stats.erros_forcados_smash ?? 0}
        />
      </Section>

      <Section title="Break points">
        <StatGrid>
          <Stat
            label="Enfrentados"
            value={stats.break_points_enfrentados ?? 0}
          />
          <Stat
            label="Convertidos pelo adversário"
            value={stats.break_points_convertidos ?? 0}
          />
          <Stat label="A favor" value={stats.break_points_a_favor ?? 0} />
          <Stat
            label="Convertidos a favor"
            value={stats.break_points_convertidos_a_favor ?? 0}
          />
        </StatGrid>
      </Section>

      <Section title="Pontos">
        <StatGrid>
          <Stat label="Pontos jogados" value={stats.pontos_totais_jogados ?? 0} />
          <Stat label="Pontos ganhos" value={stats.pontos_totais_ganhos ?? 0} />
          <Stat
            label="% de pontos ganhos"
            value={formatPercentOrUnavailable(stats.pct_pontos_ganhos)}
          />
        </StatGrid>
      </Section>
    </article>
  );
}

async function getMatchContext(
  matchId: string
): Promise<{ match: MatchContext; sets: SetContext[] }> {
  const [matchResult, setsResult] = await Promise.all([
    supabase
      .from('matches')
      .select('opponent_name, match_date')
      .eq('id', matchId)
      .single(),
    supabase
      .from('sets')
      .select(
        'set_number, player_games, opponent_games, tiebreak_player_points, tiebreak_opponent_points, winner'
      )
      .eq('match_id', matchId)
      .order('set_number', { ascending: true }),
  ]);

  if (matchResult.error) {
    throw new Error(
      `Falha ao carregar o contexto da partida: ${matchResult.error.message}`
    );
  }
  if (setsResult.error) {
    throw new Error(
      `Falha ao carregar o placar dos sets: ${setsResult.error.message}`
    );
  }

  return {
    match: matchResult.data,
    sets: setsResult.data ?? [],
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function StatGrid({ children }: { children: ReactNode }) {
  return <dl style={styles.statGrid}>{children}</dl>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={styles.stat}>
      <dt style={styles.statLabel}>{label}</dt>
      <dd style={styles.statValue}>{value}</dd>
    </div>
  );
}

function StrokeStats({
  title,
  total,
  forehand,
  backhand,
  volley,
  smash,
}: {
  title: string;
  total: number;
  forehand: number;
  backhand: number;
  volley: number;
  smash: number;
}) {
  return (
    <div style={styles.strokeGroup}>
      <h3 style={styles.strokeTitle}>{title}</h3>
      <StatGrid>
        <Stat label="Total" value={total} />
        <Stat label="Forehand" value={forehand} />
        <Stat label="Backhand" value={backhand} />
        <Stat label="Voleio" value={volley} />
        <Stat label="Smash" value={smash} />
      </StatGrid>
    </div>
  );
}

function formatPercentOrUnavailable(value: number | null): string {
  return value === null ? 'Indisponível' : percentFormatter.format(value);
}

function formatDate(value: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      )
    : new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatTiebreak(set: SetContext): string {
  if (
    set.tiebreak_player_points === null &&
    set.tiebreak_opponent_points === null
  ) {
    return '';
  }

  return ` (${set.tiebreak_player_points ?? 0}–${
    set.tiebreak_opponent_points ?? 0
  })`;
}

const styles: Record<string, CSSProperties> = {
  report: {
    maxWidth: 960,
    margin: '0 auto',
    padding: 24,
    color: '#17211b',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    padding: 24,
    borderRadius: 20,
    color: '#f7fff9',
    background: 'linear-gradient(135deg, #173f2b 0%, #226642 100%)',
    boxShadow: '0 16px 40px rgba(20, 61, 40, 0.18)',
  },
  eyebrow: {
    margin: '0 0 8px',
    color: '#b9e8c8',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.75rem, 5vw, 3rem)',
    lineHeight: 1.1,
  },
  date: {
    margin: '10px 0 20px',
    color: '#d7ede0',
  },
  setList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  setScore: {
    display: 'grid',
    gap: 2,
    minWidth: 92,
    padding: '10px 14px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.08)',
  },
  setLabel: {
    color: '#b9e8c8',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 20,
    padding: 20,
    border: '1px solid #dbe7df',
    borderRadius: 16,
    background: '#ffffff',
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: 20,
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    margin: 0,
  },
  stat: {
    minWidth: 0,
    padding: 14,
    borderRadius: 12,
    background: '#f3f7f4',
  },
  statLabel: {
    color: '#5a6b60',
    fontSize: 13,
  },
  statValue: {
    margin: '5px 0 0',
    color: '#163b28',
    fontSize: 22,
    fontWeight: 750,
  },
  strokeGroup: {
    marginTop: 18,
  },
  strokeTitle: {
    margin: '0 0 10px',
    color: '#405348',
    fontSize: 15,
  },
  message: {
    maxWidth: 720,
    margin: '32px auto',
    padding: 20,
    borderRadius: 12,
    color: '#33463a',
    background: '#f3f7f4',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  error: {
    color: '#7b1f25',
    background: '#fff0f1',
  },
};
