import React, { useState } from 'react';
import { ShoppingBag, Star, Verified, Check, MessageCircle } from 'lucide-react';
import clsx from 'clsx';

type StoreTab = 'OFFICIAL' | 'COMMUNITY';

const OFFICIAL_ITEMS = [
  { id: '1', brand: 'Wilson', name: 'Pro Staff 97 v14', price: 279, image: 'https://images.unsplash.com/photo-1617083934555-56d44efcb98c?w=500&q=80', badge: 'NEW' },
  { id: '2', brand: 'Nike', name: 'Court Zoom Vapor 11', price: 170, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', badge: 'PRO' },
  { id: '3', brand: 'Babolat', name: 'Pure Drive 2024', price: 249, image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=500&q=80' },
];

const COMMUNITY_ITEMS = [
  { id: 'c1', seller: 'Guga_K', name: 'Used Pure Aero (Condition 8/10)', price: 120, image: 'https://images.unsplash.com/photo-1522701025355-3b32db5f2fc4?w=500&q=80' },
  { id: 'c2', seller: 'RafaBulls', name: '2x Cans Penn Extra Duty', price: 8, image: 'https://images.unsplash.com/photo-1582236528741-69255018cb0f?w=500&q=80' },
];

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState<StoreTab>('OFFICIAL');

  return (
    <div className="flex-1 flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-black">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
            <ShoppingBag className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Marketplace</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-1">Gear & Apparel</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('OFFICIAL')}
            className={clsx(
              "flex-1 py-1.5 text-[11px] font-medium tracking-wide transition-all rounded-lg flex items-center justify-center gap-2",
              activeTab === 'OFFICIAL' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Verified size={14} /> Official
          </button>
          <button
            onClick={() => setActiveTab('COMMUNITY')}
            className={clsx(
              "flex-1 py-1.5 text-[11px] font-medium tracking-wide transition-all rounded-lg flex items-center justify-center gap-2",
              activeTab === 'COMMUNITY' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <MessageCircle size={14} /> Community
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-black">
        {activeTab === 'OFFICIAL' ? (
          <div className="grid grid-cols-2 gap-4">
            {OFFICIAL_ITEMS.map(item => (
              <div key={item.id} className="group relative flex flex-col bg-zinc-900/30 border border-white/5 rounded-2xl overflow-hidden hover:bg-zinc-900/50 hover:border-white/20 transition-all cursor-pointer">
                {item.badge && (
                  <span className="absolute top-3 left-3 z-10 px-2 py-1 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                    {item.badge}
                  </span>
                )}
                <div className="aspect-square bg-white/5 overflow-hidden relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mb-1 flex items-center gap-1">
                    {item.brand} <Verified size={10} className="text-emerald-500" />
                  </span>
                  <h3 className="text-sm font-medium leading-tight mb-3 flex-1 text-white">{item.name}</h3>
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-sm font-semibold">${item.price}</span>
                    <button className="w-7 h-7 bg-white text-black flex items-center justify-center rounded-full hover:scale-105 transition-transform">
                      <ShoppingBag size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {COMMUNITY_ITEMS.map(item => (
              <div key={item.id} className="flex gap-4 bg-zinc-900/30 border border-white/5 p-3 rounded-2xl hover:bg-zinc-900/50 transition-colors">
                <div className="w-24 h-24 bg-white/5 rounded-xl overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-90" />
                </div>
                <div className="flex flex-col flex-1 py-1">
                   <span className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase mb-1">
                    Seller: @{item.seller}
                   </span>
                   <h3 className="text-sm font-medium leading-snug mb-2 text-white">{item.name}</h3>
                   <div className="mt-auto flex justify-between items-end">
                     <span className="text-lg font-semibold text-white">${item.price}</span>
                     <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-colors flex items-center gap-1">
                        Make Offer
                     </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
