import React, { useState } from 'react';
import { Brain, Lock, ArrowRight, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { useUserStore } from '../store/useUserStore';

export default function AICoach() {
  const [isPro, setIsPro] = useState(false);
  const { aiCoachName } = useUserStore();

  // Mock analysis logic: in a real app, this would analyze `match_events` from the store
  const mockBackhandErrors = 18;
  const hasBackhandIssue = mockBackhandErrors > 15;

  return (
    <div className="flex-1 flex flex-col bg-black overflow-y-auto pb-12">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-black relative overflow-hidden">
        {/* Subtle glow bg */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
              <Brain className="text-white" size={20} />
            </div>
            {!isPro && (
               <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                 Free Tier
               </span>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">{aiCoachName}</h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px]">
            Analyzing sua telemetria de jogo para encontrar padrões, fraquezas e recomendar treinos focados.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-black">
        
        {/* Analytics Summary */}
        <div>
          <h2 className="text-[10px] text-zinc-500 font-medium uppercase tracking-[3px] mb-4">Últimas 5 Partidas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/30 border border-white/5 p-5 rounded-2xl">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-medium">Win Rate</span>
              <span className="text-3xl font-semibold text-white">60%</span>
            </div>
            <div className="bg-zinc-900/30 border border-white/5 p-5 rounded-2xl">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-medium">Rally Médio</span>
              <span className="text-3xl font-semibold text-white">6.2</span>
            </div>
          </div>
        </div>

        {/* Insight Card */}
        {hasBackhandIssue && (
          <div className={clsx(
            "relative rounded-3xl p-[1px] overflow-hidden transition-all",
            isPro ? "bg-gradient-to-br from-emerald-500/40 via-emerald-500/10 to-transparent shadow-lg shadow-emerald-500/5" : "bg-white/5"
          )}>
            <div className="bg-[#050505] rounded-[23px] p-6 w-full h-full relative">
              
              <div className="flex items-start gap-4">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                  isPro ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                )}>
                  <TrendingDown size={20} />
                </div>
                <div>
                  <span className={clsx(
                    "text-[10px] font-semibold uppercase tracking-widest mb-1.5 block",
                    isPro ? "text-emerald-400" : "text-rose-400"
                  )}>Padrão Crítico Detectado</span>
                  <h3 className="text-lg font-medium leading-tight mb-2 text-white">Vulnerabilidade no Backhand</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    Sua taxa de erros não forçados no lado do backhand está com média de <strong className="text-zinc-200 font-medium">18 erros</strong> por jogo, custando cerca de 4 games em média.
                  </p>
                </div>
              </div>

              {!isPro ? (
                <div className="mt-4 pt-6 border-t border-white/5">
                  <button 
                    onClick={() => setIsPro(true)}
                    className="w-full py-4 px-4 bg-white hover:bg-zinc-200 text-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Lock size={16} />
                    <span className="font-semibold text-sm">Desbloquear {aiCoachName} (Pro)</span>
                  </button>
                  <p className="text-center text-[10px] text-zinc-500 mt-4 uppercase tracking-widest font-medium">Veja correção de empunhadura e drills recomendados</p>
                </div>
              ) : (
                <div className="mt-4 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-4">Prescrição do Treinador</h4>
                  <div className="bg-white/[0.03] rounded-xl p-4 mb-3 border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-8 bg-black/50 rounded-lg flex items-center justify-center border border-white/5">
                          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent ml-1"></div>
                        </div>
                        <span className="text-sm font-medium text-white">Ajuste de Empunhadura Continental</span>
                     </div>
                     <ArrowRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-8 bg-black/50 rounded-lg flex items-center justify-center text-[9px] font-bold border border-white/5 text-zinc-400">DOC</div>
                        <span className="text-sm font-medium text-white">Drill no Paredão: 100 Repetições</span>
                     </div>
                     <ArrowRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
