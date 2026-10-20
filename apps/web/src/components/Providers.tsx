'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PwaRegister } from './PwaRegister';
import { SyncRunner } from './SyncRunner';

type Tema = 'claro' | 'oscuro';
const TemaContext = createContext<{ tema: Tema; alternar: () => void }>({
  tema: 'claro',
  alternar: () => undefined,
});

export const useTema = () => useContext(TemaContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );
  const [tema, setTema] = useState<Tema>('claro');

  useEffect(() => {
    const guardado = localStorage.getItem('sde-tema') as Tema | null;
    const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTema(guardado ?? (prefiereOscuro ? 'oscuro' : 'claro'));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro');
    localStorage.setItem('sde-tema', tema);
  }, [tema]);

  const valor = useMemo(
    () => ({ tema, alternar: () => setTema((actual) => (actual === 'claro' ? 'oscuro' : 'claro')) }),
    [tema]
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TemaContext.Provider value={valor}>
          <PwaRegister />
          <SyncRunner />
          {children}
        </TemaContext.Provider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
