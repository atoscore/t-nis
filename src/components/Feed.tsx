import React, { useState } from 'react';
import { Activity, Flame, Trophy, MapPin, Users, Heart, MessageCircle, Share2, ChevronRight, Search, Plus } from 'lucide-react';
import clsx from 'clsx';

export default function Feed() {
  const [activeTab, setActiveTab] = useState<'CITY' | 'FRIENDS' | 'NEWS' | 'TOURNAMENTS'>('CITY');
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const toggleLike = (id: number) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-black overflow-y-auto pb-20 relative">
      {/* Header */}
      <div className="pt-8 px-6 pb-2 border-b border-white/5 bg-black/90 sticky top-0 z-20 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
              <Activity className="text-emerald-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">TENNIS CORE</h1>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1 flex items-center gap-1">
                <MapPin size={10} /> São Paulo, SP
              </p>
            </div>
          </div>
          <div className="w-10 h-10 bg-zinc-900 rounded-full border border-white/10 flex items-center justify-center overflow-hidden">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Arthur" className="w-full h-full object-cover" alt="Profile" />
          </div>
        </div>

        {/* Search Bar */}
        <div className={clsx(
          "flex items-center gap-3 bg-zinc-900/50 border rounded-xl px-4 py-2.5 mb-4 transition-colors",
          isSearchFocused ? "border-emerald-500/50" : "border-white/10"
        )}>
          <Search size={16} className={isSearchFocused ? "text-emerald-400" : "text-zinc-500"} />
          <input 
            type="text" 
            placeholder="Buscar jogadores, quadras ou torneios..." 
            className="bg-transparent border-none text-sm text-white focus:outline-none w-full placeholder:text-zinc-600"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>

        {/* Scrollable Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-6 pb-2">
          {(['CITY', 'FRIENDS', 'NEWS', 'TOURNAMENTS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative py-2 text-sm font-medium whitespace-nowrap transition-colors"
            >
              <span className={activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"}>
                {tab === 'CITY' && 'Sua Cidade'}
                {tab === 'FRIENDS' && 'Amigos'}
                {tab === 'NEWS' && 'Notícias'}
                {tab === 'TOURNAMENTS' && 'Torneios'}
              </span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-emerald-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Match Result Post */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 hover:bg-zinc-900/40 transition-colors">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 p-[2px] shadow-lg shadow-emerald-500/20">
                   <div className="w-full h-full bg-black rounded-full flex items-center justify-center font-bold text-xs text-white">AM</div>
                 </div>
                 <div>
                    <h3 className="text-sm font-semibold text-white">Arthur Moraes</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Há 2 horas • Amistoso</p>
                 </div>
              </div>
              <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-400 font-semibold tracking-widest flex items-center gap-1">
                <TrendingUp size={12} /> +25 ELO
              </div>
           </div>
           
           {/* Score Card */}
           <div className="bg-black/50 rounded-2xl p-4 border border-white/5 flex items-center justify-between relative overflow-hidden mb-4">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <div className="flex-1 flex flex-col items-center">
                 <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2 border border-white/10">
                   <span className="text-sm font-bold text-white">AM</span>
                 </div>
                 <p className="text-xs font-semibold text-white">Arthur</p>
                 <p className="text-[10px] text-emerald-400 mt-1 font-medium">Winner</p>
              </div>
              
              <div className="px-6 flex flex-col items-center gap-2">
                 <div className="flex items-center gap-3 text-lg font-bold text-white">
                   <span className="w-6 text-center text-emerald-400">6</span>
                   <span className="text-zinc-700">-</span>
                   <span className="w-6 text-center">4</span>
                 </div>
                 <div className="flex items-center gap-3 text-lg font-bold text-white">
                   <span className="w-6 text-center text-emerald-400">7</span>
                   <span className="text-zinc-700">-</span>
                   <span className="w-6 text-center">6</span>
                 </div>
              </div>

              <div className="flex-1 flex flex-col items-center">
                 <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2 border border-white/10">
                   <span className="text-sm font-bold text-zinc-400">RB</span>
                 </div>
                 <p className="text-xs font-medium text-zinc-400">Rafa_Bulls</p>
              </div>
           </div>

           {/* Actions */}
           <div className="flex items-center gap-6 pt-2 border-t border-white/5">
              <button onClick={() => toggleLike(1)} className="flex items-center gap-2 text-zinc-400 hover:text-rose-400 transition-colors group">
                 <Heart size={18} className={clsx("transition-transform group-active:scale-90", likedPosts.has(1) && "fill-rose-500 text-rose-500")} />
                 <span className="text-xs font-medium">{likedPosts.has(1) ? '25' : '24'}</span>
              </button>
              <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                 <MessageCircle size={18} />
                 <span className="text-xs font-medium">3</span>
              </button>
              <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors ml-auto">
                 <Share2 size={18} />
              </button>
           </div>
        </div>

        {/* Looking for Match */}
        <div className="bg-gradient-to-br from-orange-500/10 to-rose-500/5 border border-orange-500/20 rounded-3xl p-5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full" />
           <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center font-bold text-xs text-orange-400 border border-orange-500/30">
                   JD
                 </div>
                 <div>
                    <h3 className="text-sm font-semibold text-white">João Pedro</h3>
                    <p className="text-[10px] text-orange-400/80 uppercase tracking-widest font-semibold">Procurando Jogo</p>
                 </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                 <Flame size={16} className="text-orange-500" />
              </div>
           </div>
           
           <p className="text-sm text-zinc-300 leading-relaxed mb-4 relative z-10">
             Alguém afim de bater uma bola hoje a noite? Nível amador avançado (4ª classe). Quadra já reservada!
           </p>
           
           <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-medium mb-5 relative z-10">
              <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5"><MapPin size={12} className="text-orange-400"/> Slice Tennis Club</span>
              <span className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5"><Users size={12} className="text-orange-400"/> 19:00 - 21:00</span>
           </div>
           
           <button className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 text-black rounded-xl text-sm font-semibold transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20 relative z-10">
              Aceitar Desafio
           </button>
        </div>

        {/* Local Tournament Ad */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-5 hover:bg-zinc-900/40 transition-colors">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center flex-shrink-0">
                <Trophy size={28} className="text-yellow-500" />
              </div>
              <div className="flex-1">
                 <h3 className="text-sm font-semibold text-white">Circuito Paulista Aberto</h3>
                 <p className="text-[11px] text-zinc-400 mt-1 mb-2 leading-relaxed">Inscrições abertas para as categorias 3ª, 4ª e 5ª classe. Vagas limitadas!</p>
                 <button className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-300 transition-colors">
                   Ver Detalhes <ChevronRight size={12} />
                 </button>
              </div>
           </div>
        </div>

      </div>

      {/* Floating Action Button (FAB) */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-black shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all z-30">
        <Plus size={24} />
      </button>

    </div>
  );
}

// Minimal stub for TrendingUp icon since we are adding it
function TrendingUp({ size = 24, className = "" }: { size?: number, className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
      <polyline points="16 7 22 7 22 13"></polyline>
    </svg>
  );
}
