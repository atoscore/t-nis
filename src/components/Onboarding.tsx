import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const SLIDES = [
  {
    id: 1,
    title: 'O Tênis, Quantificado.',
    subtitle: 'Rastreie cada golpe e erro não forçado com gestos simples. Sem fricção, apenas dados precisos.',
    image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80',
    overlay: (
      <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl w-48 shadow-2xl">
        <p className="text-[10px] text-zinc-300 font-semibold uppercase tracking-widest mb-3">Match Stats</p>
        <div className="flex items-end gap-2 mb-4">
           <span className="text-4xl font-semibold text-white leading-none">12</span>
           <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest pb-1">Winners</span>
        </div>
        <div className="flex gap-1.5 h-10 items-end">
           <div className="flex-1 bg-white/20 rounded-sm h-[30%]"></div>
           <div className="flex-1 bg-white/20 rounded-sm h-[60%]"></div>
           <div className="flex-1 bg-white/20 rounded-sm h-[40%]"></div>
           <div className="flex-1 bg-white/20 rounded-sm h-[80%]"></div>
           <div className="flex-1 bg-emerald-500 rounded-sm h-[100%] shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: 'Seu Treinador de Bolso.',
    subtitle: 'Nossa inteligência artificial detecta seus padrões de erro e prescreve treinos para evoluir seu jogo.',
    image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80',
    overlay: (
      <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl w-40 shadow-2xl">
        <p className="text-[10px] text-zinc-300 font-semibold uppercase tracking-widest mb-4 text-center">First Serve</p>
        <div className="relative w-20 h-20 mx-auto mb-3">
           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
             <path
                className="text-white/10"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500"
                strokeDasharray="75, 100"
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
           </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-white leading-none">75%</span>
           </div>
        </div>
        <p className="text-center text-[10px] text-emerald-400 font-semibold uppercase tracking-widest">Optimal</p>
      </div>
    )
  },
  {
    id: 3,
    title: 'Entre na Liga.',
    subtitle: 'Suba no ranking global, dispute torneios locais e acesse a loja oficial de equipamentos premium.',
    image: 'https://images.unsplash.com/photo-1627092301934-24d1a0c441b2?w=800&q=80',
    overlay: (
      <div className="absolute bottom-6 right-6 bg-black/40 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl w-44 shadow-2xl">
        <p className="text-[10px] text-zinc-300 font-semibold uppercase tracking-widest mb-4">Global Rank</p>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center font-bold text-white border border-white/20">
            88
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ELO Rating</p>
            <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Top 5% Regional</p>
          </div>
        </div>
      </div>
    )
  }
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
      {/* Brand Header */}
      <div className="absolute top-12 w-full flex justify-center z-50">
        <div className="flex flex-col items-center">
          <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase mb-2">Welcome to</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="black"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white pr-1">TENNIS OS</h1>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="flex-1 relative mt-[104px] mb-6 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full flex flex-col"
          >
             <div className="relative w-full flex-1 min-h-[50vh] rounded-[32px] overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl shrink-0">
               <img 
                 src={SLIDES[currentIndex].image} 
                 className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-luminosity"
                 alt=""
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 mix-blend-multiply" />
               {SLIDES[currentIndex].overlay}
             </div>

             <div className="mt-8 flex flex-col items-center text-center px-2">
                <h2 className="text-[22px] font-semibold tracking-tight text-white mb-3">{SLIDES[currentIndex].title}</h2>
                <p className="text-[13px] text-zinc-400 leading-relaxed font-medium">{SLIDES[currentIndex].subtitle}</p>
             </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <button 
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={clsx(
              "h-1.5 rounded-full transition-all duration-500 ease-out",
              i === currentIndex ? "w-8 bg-white" : "w-1.5 bg-white/20 hover:bg-white/40"
            )}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="px-6 pb-12 flex flex-col gap-3">
        <button 
          onClick={onComplete}
          className="w-full py-4 bg-white text-black rounded-2xl font-semibold text-[15px] hover:bg-zinc-200 transition-colors active:scale-[0.98]"
        >
          Sign Up For Free
        </button>
        <button 
          onClick={onComplete}
          className="w-full py-4 bg-transparent text-white rounded-2xl font-semibold text-[15px] hover:bg-white/5 transition-colors active:scale-[0.98]"
        >
          Log In
        </button>
        <p className="text-center text-[10px] text-zinc-600 font-semibold tracking-widest uppercase mt-4">
          Version 1.0.0 (Beta)
        </p>
      </div>
    </div>
  );
}
