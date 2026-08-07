import React, { useState } from 'react';
import { User, Settings, Activity, ChevronRight, Edit3, Bot } from 'lucide-react';
import NamingAIModal from './NamingAIModal';
import { useUserStore } from '../store/useUserStore';

const MOCK_HISTORY = [
  {
    id: 1,
    opponent: 'Rafa_Bulls',
    date: 'Hoje, 10:30',
    result: 'Vitória',
    score: '6-4, 7-6',
    isWin: true,
  },
  {
    id: 2,
    opponent: 'Carlos_S',
    date: 'Ontem, 18:00',
    result: 'Derrota',
    score: '4-6, 3-6',
    isWin: false,
  },
  {
    id: 3,
    opponent: 'João Pedro',
    date: '15 de Julho, 09:00',
    result: 'Vitória',
    score: '6-2, 6-1',
    isWin: true,
  }
];

export default function Dashboard() {
  const { aiCoachName } = useUserStore();
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col bg-black overflow-y-auto pb-8">
      {/* Cover & Avatar */}
      <div className="h-32 bg-gradient-to-br from-zinc-900 to-black border-b border-white/5 relative">
         <div className="absolute -bottom-10 left-6 w-20 h-20 bg-black rounded-full p-1">
            <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center border border-white/10 relative overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Arthur" className="w-full h-full object-cover" alt="Profile" />
            </div>
         </div>
         <button className="absolute top-6 right-6 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 text-white">
           <Settings size={16} />
         </button>
      </div>

      <div className="px-6 pt-12 pb-6 border-b border-white/5">
         <div className="flex justify-between items-start mb-2">
           <div>
             <h1 className="text-2xl font-semibold tracking-tight text-white">Arthur Moraes</h1>
             <p className="text-xs text-zinc-500 font-mono mt-1">ID: TENNIS-8829</p>
           </div>
           <button className="px-4 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-full">
             Editar
           </button>
         </div>
         <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
           Buscando aprimorar o backhand e subir para a 3ª classe neste semestre.
         </p>
      </div>

      {/* Stats Grid */}
      <div className="p-6 grid grid-cols-2 gap-4 border-b border-white/5">
         <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5">
            <span className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-medium">ELO Rating</span>
            <span className="text-2xl font-semibold text-emerald-400">1450</span>
         </div>
         <div className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5">
            <span className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-medium">Win Rate</span>
            <span className="text-2xl font-semibold text-white">68%</span>
         </div>
      </div>

      {/* Match History */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-[10px] text-zinc-500 font-medium uppercase tracking-[3px]">Histórico de Partidas</h2>
           <button className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest hover:text-emerald-300">Ver Todas</button>
        </div>
        <div className="space-y-3">
          {MOCK_HISTORY.map((match) => (
            <div key={match.id} className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                 <div className="flex items-center gap-2 mb-1">
                   <span className={`w-2 h-2 rounded-full ${match.isWin ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                   <span className={`text-xs font-bold uppercase tracking-widest ${match.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>{match.result}</span>
                 </div>
                 <p className="text-sm font-medium text-white mb-0.5">vs {match.opponent}</p>
                 <p className="text-[10px] text-zinc-500 font-medium">{match.date}</p>
              </div>
              <div className="text-right">
                 <p className="text-lg font-bold text-white tracking-tight">{match.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences / Details */}
      <div className="p-6 space-y-4">
         <h2 className="text-[10px] text-zinc-500 font-medium uppercase tracking-[3px] mb-2">Configurações</h2>
         
         <div onClick={() => setIsNamingModalOpen(true)} className="flex items-center justify-between py-3 border-b border-white/5 group cursor-pointer">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
               <Bot size={16} />
             </div>
             <span className="text-sm text-zinc-300 font-medium">Nome da IA Coach</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-semibold text-emerald-400">{aiCoachName}</span>
             <ChevronRight size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
           </div>
         </div>

         <h2 className="text-[10px] text-zinc-500 font-medium uppercase tracking-[3px] mb-2 mt-6">Ficha Técnica</h2>
         
         <DetailRow label="Altura" value="1.82m" />
         <DetailRow label="Empunhadura (Forehand)" value="Semi-Western" />
         <DetailRow label="Backhand" value="Uma mão" />
         <DetailRow label="Classe" value="4ª Classe (Amador)" />
         <DetailRow label="Academia/Clube" value="Slice Tennis Club" />
         <DetailRow label="Treinador" value="Carlos 'Guga' Santos" />
      </div>

      <NamingAIModal isOpen={isNamingModalOpen} onClose={() => setIsNamingModalOpen(false)} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 group cursor-pointer">
      <span className="text-sm text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white">{value}</span>
        <ChevronRight size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
      </div>
    </div>
  );
}
