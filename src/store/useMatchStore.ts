import { create } from 'zustand';

export type Player = 'A' | 'B';
export type TennisPoint = 0 | 1 | 2 | 3 | 4; // 0=0, 1=15, 2=30, 3=40, 4=AD

export type EventType = 'ACE' | 'WINNER' | 'UNFORCED_ERROR' | 'FORCED_ERROR' | 'DOUBLE_FAULT';
export type StrokeType = 'FOREHAND' | 'BACKHAND' | 'VOLLEY' | 'SMASH' | 'SERVE' | 'NONE';

interface MatchState {
  isSetup: boolean;
  playerAName: string;
  playerBName: string;
  playerAClass: string;
  playerBClass: string;
  
  playerAPoints: TennisPoint;
  playerBPoints: TennisPoint;
  playerAGames: number;
  playerBGames: number;
  playerASets: number;
  playerBSets: number;
  
  servingPlayer: Player;
  
  history: Omit<MatchState, 'history' | 'addEvent' | 'scorePoint' | 'undo' | 'setupMatch'>[];
  
  // Actions
  setupMatch: (aName: string, aClass: string, bName: string, bClass: string, firstServer: Player) => void;
  scorePoint: (scoringPlayer: Player, eventType: EventType, stroke: StrokeType) => void;
  undo: () => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  isSetup: true,
  playerAName: 'Você (Player)',
  playerBName: 'Adversário',
  playerAClass: 'Amador',
  playerBClass: 'Amador',
  
  playerAPoints: 0,
  playerBPoints: 0,
  playerAGames: 0,
  playerBGames: 0,
  playerASets: 0,
  playerBSets: 0,
  
  servingPlayer: 'A',
  
  history: [],

  setupMatch: (aName, aClass, bName, bClass, firstServer) => {
    set({
      isSetup: false,
      playerAName: aName,
      playerAClass: aClass,
      playerBName: bName,
      playerBClass: bClass,
      servingPlayer: firstServer,
      playerAPoints: 0,
      playerBPoints: 0,
      playerAGames: 0,
      playerBGames: 0,
      playerASets: 0,
      playerBSets: 0,
      history: []
    });
  },

  scorePoint: (scoringPlayer: Player, eventType: EventType, stroke: StrokeType) => {
    const state = get();
    // Save state to history for undo
    const currentStateSnapshot = {
      isSetup: state.isSetup,
      playerAName: state.playerAName,
      playerBName: state.playerBName,
      playerAClass: state.playerAClass,
      playerBClass: state.playerBClass,
      playerAPoints: state.playerAPoints,
      playerBPoints: state.playerBPoints,
      playerAGames: state.playerAGames,
      playerBGames: state.playerBGames,
      playerASets: state.playerASets,
      playerBSets: state.playerBSets,
      servingPlayer: state.servingPlayer,
    };

    set((prev) => {
      let aPts = prev.playerAPoints;
      let bPts = prev.playerBPoints;
      let aGames = prev.playerAGames;
      let bGames = prev.playerBGames;
      let aSets = prev.playerASets;
      let bSets = prev.playerBSets;
      let nextServer = prev.servingPlayer;

      const finishGame = (winner: Player) => {
        if (winner === 'A') aGames++; else bGames++;
        aPts = 0; bPts = 0;
        nextServer = prev.servingPlayer === 'A' ? 'B' : 'A';
        
        // Simple Set Logic (6 games wins, no tiebreak for simplicity in this mock)
        if (aGames >= 6 && aGames - bGames >= 2) {
           aSets++; aGames = 0; bGames = 0;
        } else if (bGames >= 6 && bGames - aGames >= 2) {
           bSets++; aGames = 0; bGames = 0;
        }
      };

      if (scoringPlayer === 'A') {
        if (aPts === 3 && bPts < 3) {
          finishGame('A');
        } else if (aPts === 3 && bPts === 3) {
          aPts = 4; // Ad A
        } else if (aPts === 3 && bPts === 4) {
          bPts = 3; // Deuce
        } else if (aPts === 4) {
          finishGame('A');
        } else {
          aPts++;
        }
      } else {
        if (bPts === 3 && aPts < 3) {
          finishGame('B');
        } else if (bPts === 3 && aPts === 3) {
          bPts = 4; // Ad B
        } else if (bPts === 3 && aPts === 4) {
          aPts = 3; // Deuce
        } else if (bPts === 4) {
          finishGame('B');
        } else {
          bPts++;
        }
      }

      console.log(`[EVENT] Player ${scoringPlayer} scored via ${eventType} (${stroke})`);

      return {
        playerAPoints: aPts as TennisPoint,
        playerBPoints: bPts as TennisPoint,
        playerAGames: aGames,
        playerBGames: bGames,
        playerASets: aSets,
        playerBSets: bSets,
        servingPlayer: nextServer,
        history: [...prev.history, currentStateSnapshot],
      };
    });
  },

  undo: () => {
    set((prev) => {
      if (prev.history.length === 0) return prev;
      const previousState = prev.history[prev.history.length - 1];
      return {
        ...previousState,
        history: prev.history.slice(0, -1),
      };
    });
  },
}));

export const formatPoint = (point: TennisPoint, opponentPoint: TennisPoint): string => {
  if (point === 4) return 'AD';
  if (opponentPoint === 4) return ' '; 
  const map: Record<number, string> = { 0: '0', 1: '15', 2: '30', 3: '40' };
  return map[point] || '0';
};
