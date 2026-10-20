export const ROLES = ['ADMIN', 'EDITOR'] as const;
export type Rol = (typeof ROLES)[number];

export const ESTADOS_TRAMO = ['TRANSITABLE', 'REGULAR', 'INTRANSITABLE', 'EN_OBRA'] as const;
export type EstadoTramoClave = (typeof ESTADOS_TRAMO)[number];

export const TIPOS_VIA = ['RUTA', 'CAMINO_RURAL', 'CALLE'] as const;
export type TipoViaClave = (typeof TIPOS_VIA)[number];

export const TIPOS_INFRAESTRUCTURA = ['ALCANTARILLA', 'PUENTE', 'TAPA'] as const;
export type TipoInfraestructura = (typeof TIPOS_INFRAESTRUCTURA)[number];

export const TIPOS_MANTENIMIENTO = ['PREVENTIVO', 'CORRECTIVO', 'MEJORA', 'OTRO'] as const;
export type TipoMantenimiento = (typeof TIPOS_MANTENIMIENTO)[number];

export const ESTADOS_SUGERENCIA = ['PENDIENTE', 'REVISADA', 'DESCARTADA'] as const;
export type EstadoSugerencia = (typeof ESTADOS_SUGERENCIA)[number];

export const ACCIONES_AUDITORIA = ['CREAR', 'EDITAR', 'BORRAR', 'IMPORTAR', 'LOGIN'] as const;
export type AccionAuditoria = (typeof ACCIONES_AUDITORIA)[number];

export const ACCIONES_PERMISO = ['ver', 'crear', 'editar', 'borrar'] as const;
export type AccionPermiso = (typeof ACCIONES_PERMISO)[number];

export const CAPAS_BASE = [
  'CAMINOS',
  'TRAMOS',
  'MANTENIMIENTOS',
  'INFRAESTRUCTURA',
  'PUNTOS_INTERES',
  'FOTOS',
  'SUGERENCIAS',
] as const;
export type CapaClave = (typeof CAPAS_BASE)[number];
