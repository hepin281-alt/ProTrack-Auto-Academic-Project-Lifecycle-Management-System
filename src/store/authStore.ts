import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState {
 token: string | null;
 user: {
 user_id: string;
 email: string;
 full_name?: string;
 role: 'STUDENT' | 'GUIDE' | 'COORDINATOR' | 'COMMITTEE';
 prn_no?: string | null;
 roll_no?: string | null;
 batch_year?: number | null;
 } | null;
 isAuthenticated: boolean;
 isLoading: boolean;
 setAuth: (token: string, user: AuthState['user']) => void;
 clearAuth: () => void;
 setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
 persist(
 (set) => ({
 token: null,
 user: null,
 isAuthenticated: false,
 isLoading: false,
 setAuth: (token: string, user: AuthState['user']) =>
 set({ token, user, isAuthenticated: true, isLoading: false }),
 clearAuth: () =>
 set({ token: null, user: null, isAuthenticated: false, isLoading: false }),
 setLoading: (loading: boolean) => set({ isLoading: loading })
 }),
 { name: 'auth-store' }
 )
);
