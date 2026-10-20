'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { contarPendientes } from '@/lib/offline/db';
import { sincronizar, verificarConexion } from '@/lib/offline/sync';
import { useSyncStore } from '@/lib/stores';

export function SyncRunner() {
  const { status } = useSession();
  const { setOnline, setPendientes, setSincronizando, setUltimoError } = useSyncStore();

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelado = false;

    const actualizarEstado = async () => {
      const online = await verificarConexion();
      if (cancelado) return;
      setOnline(online);
      setPendientes(await contarPendientes());
      if (!online) return;

      try {
        setSincronizando(true);
        const resultado = await sincronizar();
        if (resultado.procesadas > 0) {
          setPendientes(await contarPendientes());
          setUltimoError(resultado.errores > 0 ? `${resultado.errores} operación(es) con error.` : null);
        }
      } catch (error) {
        setUltimoError(error instanceof Error ? error.message : 'Error de sincronización.');
      } finally {
        if (!cancelado) setSincronizando(false);
      }
    };

    void actualizarEstado();
    const intervalo = window.setInterval(actualizarEstado, 30_000);
    window.addEventListener('online', actualizarEstado);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      window.removeEventListener('online', actualizarEstado);
    };
  }, [status, setOnline, setPendientes, setSincronizando, setUltimoError]);

  return null;
}
