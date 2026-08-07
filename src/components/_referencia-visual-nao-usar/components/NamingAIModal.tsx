import React, { useState, useEffect } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUserStore } from '../store/useUserStore';

interface NamingAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NamingAIModal({ isOpen, onClose }: NamingAIModalProps) {
  const { aiCoachName, setAiCoachName } = useUserStore();
  const [name, setName] = useState(aiCoachName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(aiCoachName);
      setError('');
    }
  }, [isOpen, aiCoachName]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('O nome não pode estar vazio.');
      return;
    }
    if (name.length > 20) {
      setError('O nome deve ter no máximo 20 caracteres.');
      return;
    }
    setAiCoachName(name.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
          >
            {/* Glow effect */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-[60px]" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                <Bot size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white tracking-tight">Nomear IA</h3>
                <p className="text-xs text-zinc-400 mt-1">Personalize seu treinador virtual</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">
                  Nome da IA Coach
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    placeholder="Ex: RafaAI, TennisGpt..."
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    autoFocus
                  />
                  <Sparkles size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                </div>
                {error && <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p>}
              </div>

              <button
                onClick={handleSave}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-colors active:scale-[0.98]"
              >
                Salvar Nome
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
