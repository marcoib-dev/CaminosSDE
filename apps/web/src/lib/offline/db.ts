import Dexie, { type Table } from 'dexie';
import type { OperacionSync } from '@sde/shared';

export interface OperacionPendiente {
  id?: number;
  operacionId: string;
  tipo: OperacionSync['tipo'];
  payload: Record<string, unknown>;
  creadoEn: string;
  sincronizada: 0 | 1;
  intentos: number;
  error?: string;
}

class BaseOffline extends Dexie {
  operaciones!: Table<OperacionPendiente, number>;

  constructor() {
    super('sde-vial-offline');
    this.version(1).stores({
      operaciones: '++id, operacionId, tipo, creadoEn, sincronizada',
    });
  }
}

export const db = new BaseOffline();

export async function encolar(operacion: OperacionSync) {
  return db.operaciones.add({
    operacionId: operacion.id,
    tipo: operacion.tipo,
    payload: operacion.payload,
    creadoEn: new Date().toISOString(),
    sincronizada: 0,
    intentos: 0,
  });
}

export async function pendientes(limite = 50) {
  const operaciones = await db.operaciones.where('sincronizada').equals(0).sortBy('creadoEn');
  return operaciones.slice(0, limite);
}

export async function marcarSincronizada(id: number) {
  await db.operaciones.update(id, { sincronizada: 1 });
}

export async function marcarError(id: number, error: string) {
  const actual = await db.operaciones.get(id);
  await db.operaciones.update(id, { error, intentos: (actual?.intentos ?? 0) + 1 });
}

export async function limpiarSincronizadas() {
  await db.operaciones.filter((operacion) => operacion.sincronizada === 1).delete();
}

export const contarPendientes = () =>
  db.operaciones.where('sincronizada').equals(0).count();
