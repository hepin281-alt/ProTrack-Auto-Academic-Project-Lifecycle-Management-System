import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Role = 'student' | 'faculty' | 'coordinator' | 'committee' | null;

interface UserState {
 role: Role;
 name: string;
 isDarkMode: boolean;
 setRole: (role: Role) => void;
 setName: (name: string) => void;
 toggleTheme: () => void;
 logout: () => void;
}

export const useStore = create<UserState>()(
 persist(
 (set) => ({
 role: null,
 name: '',
 isDarkMode: true,
 setRole: (role) => set({ role }),
 setName: (name) => set({ name }),
 toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
 logout: () => set({ role: null, name: '' }),
 }),
 {
 name: 'protrack-storage',
 }
 )
);
