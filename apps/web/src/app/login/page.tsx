'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { LogIn, Route } from 'lucide-react';
import { Aviso } from '@/components/ui/Aviso';

export default function PaginaLogin() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCargando(true);
    setError('');
    const resultado = await signIn('credentials', { email, password, redirect: false });
    setCargando(false);
    if (!resultado || resultado.error) {
      setError('Email o contraseña incorrectos.');
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4">
      <div className="tarjeta w-full">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-marca text-white">
            <Route size={22} />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Ingresar</h1>
            <p className="text-sm text-suave">Sistema de Información Provincial — Vialidad</p>
          </div>
        </div>

        {status === 'authenticated' ? (
          <div className="space-y-3">
            <Aviso tipo="ok">Ya tenés una sesión activa.</Aviso>
            <button className="boton-primario w-full" onClick={() => router.push('/')}>
              Ir al mapa
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label className="etiqueta">Email</label>
              <input
                type="email"
                className="campo"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="etiqueta">Contraseña</label>
              <input
                type="password"
                className="campo"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <Aviso tipo="error">{error}</Aviso>}
            <button className="boton-primario w-full" disabled={cargando}>
              <LogIn size={16} /> {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
            <p className="text-center text-xs text-suave">
              El acceso es solo para editores y administradores. El mapa público no requiere cuenta.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
