import React, { useState, useEffect } from 'react';
import { Undo2, Activity, Play, ChevronLeft } from 'lucide-react';
import { Player, formatPoint, useMatchStore, EventType, StrokeType } from '../store/useMatchStore';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function triggerHaptic(type: 'light' | 'heavy') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (type === 'heavy') navigator.vibrate([50]);
    else navigator.vibrate([20]);
  }
}

export default function Scorekeeper() {
  const { isSetup } = useMatchStore();
  
  if (isSetup) {
    return <MatchSetup />;
  }

  return <CourtScorekeeper />;
}

function MatchSetup() {
  const { setupMatch } = useMatchStore();
  const [p1, setP1] = useState('Você (ID: 8829)');
  const [p2, setP2] = useState('');
  
  return (
    <div className="flex-1 flex flex-col bg-black overflow-y-auto pb-8">
      <div className="p-8 border-b border-white/5 bg-black">
        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">Novo Jogo</h1>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Configuração da Partida</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Player 1 (Você)</span>
            <input 
              type="text" 
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Nome ou ID"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Player 2 (Adversário)</span>
            <input 
              type="text" 
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Nome ou ID do adversário"
            />
          </label>
        </div>

        <button 
          onClick={() => setupMatch(p1, 'Amador', p2 || 'Adversário', 'Amador', 'A')}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-8"
        >
          <Play size={16} /> Iniciar Partida
        </button>
      </div>
    </div>
  );
}

function CourtScorekeeper() {
  const { 
    playerAName, playerBName,
    playerAPoints, playerBPoints, 
    playerAGames, playerBGames, 
    playerASets, playerBSets,
    servingPlayer,
    scorePoint, undo 
  } = useMatchStore();

  const [activeActionPlayer, setActiveActionPlayer] = useState<Player | null>(null);
  const [pointScoredFor, setPointScoredFor] = useState<Player | null>(null);

  const handlePointAction = (eventType: EventType, stroke: StrokeType) => {
    if (!activeActionPlayer) return;
    const scoredPlayer = activeActionPlayer;
    scorePoint(activeActionPlayer, eventType, stroke);
    setActiveActionPlayer(null);
    triggerHaptic('heavy');

    setPointScoredFor(scoredPlayer);
    setTimeout(() => setPointScoredFor(null), 1000);
  };

  return (
    <div className="flex-1 flex flex-col relative bg-zinc-950">
      
      {/* Top Header */}
      <div className="absolute z-50 top-6 w-full px-6 flex justify-between items-center pointer-events-none">
        <button onClick={() => { triggerHaptic('light'); undo(); }} className="p-3 bg-white/5 rounded-full border border-white/10 backdrop-blur-md active:scale-95 transition-transform pointer-events-auto text-white">
          <Undo2 size={18} />
        </button>
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
           <span className="text-[10px] font-bold tracking-widest text-zinc-300 uppercase">Live</span>
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* The Tennis Court UI */}
      <div className="flex-1 p-6 flex flex-col justify-center relative">
         
         {/* Court Background Container */}
         <div className="absolute inset-4 top-20 bottom-8 border-4 border-emerald-900/30 rounded-lg flex flex-col overflow-hidden bg-emerald-950/10">
            {/* Net Line */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/20 -translate-y-1/2 z-10" />
            
            {/* Top Court (Player B) */}
            <div 
              className={clsx(
                "flex-1 relative transition-colors duration-500 overflow-hidden",
                servingPlayer === 'B' ? "bg-emerald-900/10" : ""
              )}
            >
               <AnimatePresence>
                 {pointScoredFor === 'B' && (
                   <motion.div 
                     initial={{ scale: 0, opacity: 0.8 }}
                     animate={{ scale: 2.5, opacity: 0 }}
                     exit={{ opacity: 0 }}
                     transition={{ duration: 0.7, ease: "easeOut" }}
                     className="absolute inset-0 m-auto w-32 h-32 rounded-full border-[8px] border-[#ccff00]"
                   />
                 )}
               </AnimatePresence>
               <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <span className="text-xs font-semibold text-zinc-500 tracking-widest uppercase mb-4">{playerBName}</span>
                  <motion.div 
                    animate={pointScoredFor === 'B' ? { 
                      scale: [1, 1.2, 1], 
                      color: ["#d4d4d8", "#ccff00", "#d4d4d8"],
                      textShadow: ["0px 0px 0px rgba(204,255,0,0)", "0px 0px 40px rgba(204,255,0,0.8)", "0px 0px 0px rgba(204,255,0,0)"]
                    } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-[80px] font-medium leading-none tabular-nums text-zinc-300 opacity-80"
                  >
                    {formatPoint(playerBPoints, playerAPoints)}
                  </motion.div>
                  {servingPlayer === 'B' && <div className="mt-4 w-2 h-2 rounded-full bg-emerald-500" />}
               </div>
            </div>

            {/* Bottom Court (Player A) */}
            <div 
              className={clsx(
                "flex-1 relative transition-colors duration-500 overflow-hidden",
                servingPlayer === 'A' ? "bg-emerald-900/10" : ""
              )}
            >
               <AnimatePresence>
                 {pointScoredFor === 'A' && (
                   <motion.div 
                     initial={{ scale: 0, opacity: 0.8 }}
                     animate={{ scale: 2.5, opacity: 0 }}
                     exit={{ opacity: 0 }}
                     transition={{ duration: 0.7, ease: "easeOut" }}
                     className="absolute inset-0 m-auto w-32 h-32 rounded-full border-[8px] border-[#ccff00]"
                   />
                 )}
               </AnimatePresence>
               <div className="absolute inset-0 flex flex-col-reverse items-center justify-center p-4">
                  <span className="text-xs font-semibold text-white tracking-widest uppercase mt-4">{playerAName}</span>
                  <motion.div 
                    animate={pointScoredFor === 'A' ? { 
                      scale: [1, 1.2, 1], 
                      color: ["#ffffff", "#ccff00", "#ffffff"],
                      textShadow: ["0px 0px 0px rgba(204,255,0,0)", "0px 0px 40px rgba(204,255,0,0.8)", "0px 0px 0px rgba(204,255,0,0)"]
                    } : {}}
                    transition={{ duration: 0.5 }}
                    className="text-[100px] font-medium leading-none tabular-nums text-white"
                  >
                    {formatPoint(playerAPoints, playerBPoints)}
                  </motion.div>
                  {servingPlayer === 'A' && <div className="mb-4 w-2 h-2 rounded-full bg-emerald-500" />}
               </div>
            </div>
         </div>

         {/* Center Scoreboard Overlay */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex gap-6 shadow-2xl">
               <div className="text-center">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Sets</span>
                  <span className="text-xl font-semibold text-white">{playerBSets}</span>
               </div>
               <div className="text-center">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Games</span>
                  <span className="text-2xl font-semibold text-white">{playerBGames}</span>
               </div>
               <div className="w-px bg-white/10" />
               <div className="text-center">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Games</span>
                  <span className="text-2xl font-semibold text-white">{playerAGames}</span>
               </div>
               <div className="text-center">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Sets</span>
                  <span className="text-xl font-semibold text-white">{playerASets}</span>
               </div>
            </div>
         </div>

         {/* Tap Areas for Point Action */}
         {!activeActionPlayer && (
           <>
             <button onClick={() => setActiveActionPlayer('B')} className="absolute top-20 left-4 right-4 h-[40%] z-30 focus:outline-none" aria-label="Point for Player B" />
             <button onClick={() => setActiveActionPlayer('A')} className="absolute bottom-8 left-4 right-4 h-[40%] z-30 focus:outline-none" aria-label="Point for Player A" />
           </>
         )}
      </div>

      {/* Action Drawer Modal */}
      {activeActionPlayer && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-950 border-t border-white/10 rounded-t-3xl p-6 animate-in slide-in-from-bottom-full duration-200">
             <div className="flex items-center justify-between mb-6">
                <button onClick={() => setActiveActionPlayer(null)} className="p-2 -ml-2 text-zinc-400">
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-sm font-medium text-white">
                  Ponto para {activeActionPlayer === 'A' ? playerAName : playerBName}
                </h3>
                <div className="w-8" />
             </div>

             <div className="space-y-6">
                {/* How was the point won? */}
                <div>
                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Tipo do Ponto</p>
                   <div className="grid grid-cols-2 gap-2">
                     <ActionButton onClick={() => handlePointAction('WINNER', 'FOREHAND')} label="Winner (Forehand)" color="emerald" />
                     <ActionButton onClick={() => handlePointAction('WINNER', 'BACKHAND')} label="Winner (Backhand)" color="emerald" />
                     <ActionButton onClick={() => handlePointAction('WINNER', 'VOLLEY')} label="Voleio Vencedor" color="emerald" />
                     {servingPlayer === activeActionPlayer && (
                       <ActionButton onClick={() => handlePointAction('ACE', 'SERVE')} label="Ace" color="blue" />
                     )}
                   </div>
                </div>

                <div>
                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Erro do Adversário</p>
                   <div className="grid grid-cols-2 gap-2">
                     <ActionButton onClick={() => handlePointAction('UNFORCED_ERROR', 'FOREHAND')} label="Erro Não Forçado (FH)" color="rose" />
                     <ActionButton onClick={() => handlePointAction('UNFORCED_ERROR', 'BACKHAND')} label="Erro Não Forçado (BH)" color="rose" />
                     <ActionButton onClick={() => handlePointAction('FORCED_ERROR', 'NONE')} label="Erro Forçado" color="orange" />
                     {servingPlayer !== activeActionPlayer && (
                       <ActionButton onClick={() => handlePointAction('DOUBLE_FAULT', 'SERVE')} label="Dupla Falta" color="rose" />
                     )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ActionButton({ onClick, label, color }: { onClick: () => void, label: string, color: 'emerald' | 'rose' | 'blue' | 'orange' }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20',
  };

  return (
    <button 
      onClick={onClick}
      className={clsx(
        "p-3 rounded-xl border text-xs font-medium text-left transition-colors active:scale-95",
        colorClasses[color]
      )}
    >
      {label}
    </button>
  );
}
