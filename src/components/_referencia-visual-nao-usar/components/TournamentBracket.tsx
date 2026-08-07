import React, { useState } from 'react';
import { ChevronRight, Trophy } from 'lucide-react';
import clsx from 'clsx';

// Mock Bracket Data Structure
type MatchNode = {
  id: string;
  player1: { name: string; seed: number; score?: string } | null;
  player2: { name: string; seed: number; score?: string } | null;
  winner?: 1 | 2;
  status: 'COMPLETED' | 'LIVE' | 'SCHEDULED';
};

const MOCK_BRACKET: Record<string, MatchNode[]> = {
  'Quarterfinals': [
    { id: 'q1', player1: { name: 'J. Sinner', seed: 1, score: '6-4, 6-2' }, player2: { name: 'T. Fritz', seed: 8, score: '4-6, 2-6' }, winner: 1, status: 'COMPLETED' },
    { id: 'q2', player1: { name: 'C. Alcaraz', seed: 4, score: '7-6, 6-4' }, player2: { name: 'A. Zverev', seed: 5, score: '6-7, 4-6' }, winner: 1, status: 'COMPLETED' },
    { id: 'q3', player1: { name: 'D. Medvedev', seed: 3, score: '6-3, 6-3' }, player2: { name: 'H. Rune', seed: 6, score: '3-6, 3-6' }, winner: 1, status: 'COMPLETED' },
    { id: 'q4', player1: { name: 'A. Rublev', seed: 7 }, player2: { name: 'N. Djokovic', seed: 2 }, status: 'LIVE' },
  ],
  'Semifinals': [
    { id: 's1', player1: { name: 'J. Sinner', seed: 1 }, player2: { name: 'C. Alcaraz', seed: 4 }, status: 'SCHEDULED' },
    { id: 's2', player1: { name: 'D. Medvedev', seed: 3 }, player2: null, status: 'SCHEDULED' },
  ],
  'Final': [
    { id: 'f1', player1: null, player2: null, status: 'SCHEDULED' }
  ]
};

export default function TournamentBracket() {
  const [activeRound, setActiveRound] = useState<'Quarterfinals' | 'Semifinals' | 'Final'>('Quarterfinals');

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-black">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
            <Trophy className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">OS Masters 1000</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1">Hard Court • Knockout</p>
          </div>
        </div>
      </div>

      {/* Round Tabs */}
      <div className="px-4 py-4 border-b border-white/5 bg-black">
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5">
          {(['Quarterfinals', 'Semifinals', 'Final'] as const).map(round => (
            <button
              key={round}
              onClick={() => setActiveRound(round)}
              className={clsx(
                "flex-1 py-1.5 text-[11px] font-medium tracking-wide transition-all rounded-lg",
                activeRound === round 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {round}
            </button>
          ))}
        </div>
      </div>

      {/* Bracket List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
        {MOCK_BRACKET[activeRound].map((match, idx) => (
          <MatchCard key={match.id} match={match} matchNumber={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, matchNumber, key }: { match: MatchNode, matchNumber: number, key?: string | number }) {
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden group hover:bg-zinc-900/50 hover:border-white/10 transition-all">
      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Match {matchNumber}</span>
        {match.status === 'LIVE' && <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-semibold rounded-full uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>LIVE</span>}
        {match.status === 'COMPLETED' && <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest">FINAL</span>}
      </div>
      
      <div className="p-4 flex flex-col gap-3 relative">
        {/* Player 1 */}
        <div className={clsx("flex justify-between items-center", match.winner === 1 ? "opacity-100" : match.winner === 2 ? "opacity-40" : "opacity-100")}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium text-zinc-500 w-4">{match.player1?.seed || '-'}</span>
            <span className={clsx("text-sm font-medium", match.winner === 1 ? "text-white" : "text-zinc-300")}>{match.player1?.name || 'TBD'}</span>
          </div>
          {match.player1?.score && <span className="text-xs font-medium text-zinc-400">{match.player1.score}</span>}
          {match.winner === 1 && <ChevronRight className="absolute right-4 text-zinc-600" size={16} />}
        </div>

        {/* Divider line */}
        <div className="w-full h-px bg-white/5 my-0.5"></div>

        {/* Player 2 */}
        <div className={clsx("flex justify-between items-center", match.winner === 2 ? "opacity-100" : match.winner === 1 ? "opacity-40" : "opacity-100")}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium text-zinc-500 w-4">{match.player2?.seed || '-'}</span>
            <span className={clsx("text-sm font-medium", match.winner === 2 ? "text-white" : "text-zinc-300")}>{match.player2?.name || 'TBD'}</span>
          </div>
          {match.player2?.score && <span className="text-xs font-medium text-zinc-400">{match.player2.score}</span>}
          {match.winner === 2 && <ChevronRight className="absolute right-4 text-zinc-600" size={16} />}
        </div>
      </div>
    </div>
  );
}
