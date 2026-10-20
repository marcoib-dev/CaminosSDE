import { api } from '../api-client';
import {
  contarPendientes,
  limpiarSincronizadas,
  marcarError,
  marcarSincronizada,
  pendientes,
} from './db';

export interface ResultadoSync {
  id: string;
  ok: boolean;
  error?: string;
  conflicto?: boolean;
}

export async function sincronizar(): Promise<{ procesadas: number; errores: number }> {
  let procesadas = 0;
  let errores = 0;

  // Procesamos lotes de 50 hasta vaciar la cola o encontrar un error que requiera atención.
  for (let vuelta = 0; vuelta < 20; vuelta += 1) {
    const operaciones = await pendientes();
    if (operaciones.length === 0) break;

    const respuesta = await api<{ datos: { resultados: ResultadoSync[] } }>('/sync/batch', {
      method: 'POST',
      body: JSON.stringify({
        operaciones: operaciones.map(({ operacionId, tipo, payload }) => ({ id: operacionId, tipo, payload })),
      }),
    });

    const porId = new Map(respuesta.datos.resultados.map((resultado) => [resultado.id, resultado]));
    let erroresLote = 0;

    for (const operacion of operaciones) {
      const resultado = porId.get(operacion.operacionId);
      if (!resultado) {
        await marcarError(operacion.id!, 'El servidor no devolvió el resultado de la operación.');
        erroresLote += 1;
        continue;
      }
      if (resultado.ok) {
        await marcarSincronizada(operacion.id!);
      } else if (resultado.conflicto) {
        // Un conflicto (por ejemplo, el tramo ya no existe) no se reintenta.
        await marcarSincronizada(operacion.id!);
        erroresLote += 1;
      } else {
        await marcarError(operacion.id!, resultado.error ?? 'Error de sincronización.');
        erroresLote += 1;
      }
    }

    await limpiarSincronizadas();
    procesadas += operaciones.length;
    errores += erroresLote;

    // Si hubo errores, no repetimos el mismo lote inmediatamente.
    if (erroresLote > 0) break;
  }

  return { procesadas, errores };
}

export async function verificarConexion() {
  try {
    const respuesta = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/health`, {
      cache: 'no-store',
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}

export { contarPendientes };
