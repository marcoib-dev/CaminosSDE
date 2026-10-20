import type { EstadoTramoDTO, TipoViaDTO } from '@sde/shared';

export const COLORES_ESTADO: Record<string, string> = {
  TRANSITABLE: '#16a34a',
  REGULAR: '#eab308',
  INTRANSITABLE: '#dc2626',
  EN_OBRA: '#2563eb',
};

export const COLORES_TIPO_VIA: Record<string, string> = {
  RUTA: '#1d4ed8',
  CAMINO_RURAL: '#b45309',
  CALLE: '#7c3aed',
};

export const ESTILOS_TIPO_VIA: Record<string, { dashArray?: string; weight: number }> = {
  RUTA: { weight: 5 },
  CAMINO_RURAL: { dashArray: '10 8', weight: 4 },
  CALLE: { dashArray: '2 6', weight: 4 },
};

export const colorEstado = (estado?: Pick<EstadoTramoDTO, 'clave' | 'colorHex'> | null) =>
  estado?.colorHex ?? COLORES_ESTADO[estado?.clave ?? ''] ?? '#64748b';

export const colorTipoVia = (tipo?: Pick<TipoViaDTO, 'clave'> | null) =>
  COLORES_TIPO_VIA[tipo?.clave ?? ''] ?? '#475569';

export const estiloTipoVia = (tipo?: Pick<TipoViaDTO, 'clave'> | null) =>
  ESTILOS_TIPO_VIA[tipo?.clave ?? ''] ?? { weight: 4 };

export const TIPOS_MANTENIMIENTO = [
  { valor: 'PREVENTIVO', nombre: 'Preventivo' },
  { valor: 'CORRECTIVO', nombre: 'Correctivo' },
  { valor: 'MEJORA', nombre: 'Mejora' },
  { valor: 'OTRO', nombre: 'Otro' },
] as const;

export const TIPOS_INFRAESTRUCTURA = [
  { valor: 'ALCANTARILLA', nombre: 'Alcantarilla', icono: '▤' },
  { valor: 'PUENTE', nombre: 'Puente', icono: '≡' },
  { valor: 'TAPA', nombre: 'Tapa', icono: '○' },
] as const;
