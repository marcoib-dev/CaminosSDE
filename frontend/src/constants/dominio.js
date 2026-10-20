/**
 * Definiciones de dominio compartidas por el mapa, la leyenda y las tablas.
 * Los colores se usan tanto en Leaflet como en la interfaz.
 */

export const ESTADOS = {
  TRANSITABLE: {
    etiqueta: 'Transitable',
    color: '#16a34a',
    descripcion: 'Tránsito normal en cualquier época del año.',
  },
  REGULAR: {
    etiqueta: 'Regular',
    color: '#eab308',
    descripcion: 'Transitable con precaución, requiere mantenimiento.',
  },
  INTRANSITABLE: {
    etiqueta: 'Intransitable',
    color: '#dc2626',
    descripcion: 'No permite el paso o queda cortado con lluvias.',
  },
  EN_OBRA: {
    etiqueta: 'En obra',
    color: '#2563eb',
    descripcion: 'Con trabajos de mejora en ejecución.',
  },
};

export const ORDEN_ESTADOS = ['TRANSITABLE', 'REGULAR', 'INTRANSITABLE', 'EN_OBRA'];

export const TIPOS = {
  TIERRA: {
    etiqueta: 'Tierra',
    color: '#9a6b3f',
    dashArray: '2 7',
    patron: 'Punteada',
  },
  RIPIO: {
    etiqueta: 'Ripio',
    color: '#78716c',
    dashArray: '9 6',
    patron: 'Guiones largos',
  },
  ENRIPIADO_MEJORADO: {
    etiqueta: 'Enripiado mejorado',
    color: '#0f766e',
    dashArray: '16 5 3 5',
    patron: 'Guion y punto',
  },
  PAVIMENTADO: {
    etiqueta: 'Pavimentado',
    color: '#334155',
    dashArray: null,
    patron: 'Continua',
  },
};

export const ORDEN_TIPOS = ['TIERRA', 'RIPIO', 'ENRIPIADO_MEJORADO', 'PAVIMENTADO'];

export const CATEGORIAS_POI = {
  HOSPITAL: { etiqueta: 'Hospital', color: '#dc2626', inicial: 'H' },
  ESCUELA: { etiqueta: 'Escuela', color: '#d97706', inicial: 'E' },
  UPA: { etiqueta: 'UPA', color: '#2563eb', inicial: 'U' },
};

export const ORDEN_CATEGORIAS_POI = ['HOSPITAL', 'ESCUELA', 'UPA'];
