'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api-client';
import { Aviso } from './ui/Aviso';

export function PerfilCliente() {
  const { data: sesion } = useSession();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  const cambiar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCargando(true);
    setMensaje(null);
    try {
      await api<{ mensaje: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ passwordActual: actual, passwordNueva: nueva }),
      });
      setMensaje({ tipo: 'ok', texto: 'Contraseña actualizada.' });
      setActual('');
      setNueva('');
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cambiar.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="tarjeta">
        <h1 className="mb-1 text-xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-suave">Datos de la cuenta y seguridad.</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-suave">Nombre</dt>
            <dd className="font-medium">{sesion?.user.name}</dd>
          </div>
          <div>
            <dt className="text-suave">Email</dt>
            <dd className="font-medium">{sesion?.user.email}</dd>
          </div>
          <div>
            <dt className="text-suave">Rol</dt>
            <dd className="font-medium">{sesion?.user.rol}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={cambiar} className="tarjeta space-y-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound size={18} /> Cambiar contraseña
        </h2>
        <div>
          <label className="etiqueta">Contraseña actual</label>
          <input type="password" className="campo" value={actual} onChange={(e) => setActual(e.target.value)} required />
        </div>
        <div>
          <label className="etiqueta">Contraseña nueva</label>
          <input
            type="password"
            className="campo"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
        <button className="boton-primario" disabled={cargando}>
          {cargando ? 'Guardando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  );
}
