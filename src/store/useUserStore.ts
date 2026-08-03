import { create } from 'zustand';

interface UserState {
  aiCoachName: string;
  setAiCoachName: (name: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  aiCoachName: 'TENNIS CORE',
  setAiCoachName: (name) => set({ aiCoachName: name }),
}));
