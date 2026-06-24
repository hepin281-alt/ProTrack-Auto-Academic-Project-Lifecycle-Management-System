import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { inject } from '@vercel/analytics';
import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient({
 defaultOptions: {
 queries: {
 staleTime: 30_000, // 30s — avoids hammering on every focus
 retry: 1,
 refetchOnWindowFocus: false,
 },
 },
});

inject();

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <QueryClientProvider client={queryClient}>
 <App />
 </QueryClientProvider>
 </StrictMode>,
);
