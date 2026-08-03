import React, { useState } from 'react';
import { Trophy, Activity, ShoppingBag, Brain, Home, User } from 'lucide-react';
import Scorekeeper from './components/Scorekeeper';
import TournamentBracket from './components/TournamentBracket';
import Marketplace from './components/Marketplace';
import AICoach from './components/AICoach';
import Onboarding from './components/Onboarding';
import Feed from './components/Feed';
import Dashboard from './components/Dashboard';

type Tab = 'FEED' | 'SCORE' | 'COACH' | 'STORE' | 'PROFILE';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('FEED');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 font-sans flex justify-center items-center overflow-hidden touch-none selection:bg-white/20">
        <div className="w-full h-[100dvh] max-w-md bg-black border-x border-white/5 relative shadow-2xl flex flex-col overflow-hidden">
          <Onboarding onComplete={() => setIsAuthenticated(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex justify-center items-center overflow-hidden touch-none selection:bg-white/20">
      {/* Mobile container constraint for web preview */}
      <div className="w-full h-[100dvh] max-w-md bg-black border-x border-white/5 relative shadow-2xl flex flex-col overflow-hidden">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col pb-[64px]">
          {activeTab === 'FEED' && <Feed />}
          {activeTab === 'SCORE' && <Scorekeeper />}
          {activeTab === 'COACH' && <AICoach />}
          {activeTab === 'STORE' && <Marketplace />}
          {activeTab === 'PROFILE' && <Dashboard />}
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 w-full h-[64px] bg-black/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 pb-safe z-50">
          <NavItem 
            active={activeTab === 'FEED'} 
            onClick={() => setActiveTab('FEED')}
            icon={<Home size={20} />}
            label="Início"
          />
          <NavItem 
            active={activeTab === 'SCORE'} 
            onClick={() => setActiveTab('SCORE')}
            icon={<Activity size={20} />}
            label="Score"
          />
          <NavItem 
            active={activeTab === 'COACH'} 
            onClick={() => setActiveTab('COACH')}
            icon={<Brain size={20} />}
            label="Coach"
          />
          <NavItem 
            active={activeTab === 'STORE'} 
            onClick={() => setActiveTab('STORE')}
            icon={<ShoppingBag size={20} />}
            label="Loja"
          />
          <NavItem 
            active={activeTab === 'PROFILE'} 
            onClick={() => setActiveTab('PROFILE')}
            icon={<User size={20} />}
            label="Perfil"
          />
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-[60px] h-full transition-colors ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
    >
      {icon}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}
