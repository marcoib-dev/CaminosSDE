const formatoNumero = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatoEntero = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 0,
});

export function formatearKm(valor) {
  const numero = Number(valor);
  return `${formatoNumero.format(Number.isFinite(numero) ? numero : 0)} km`;
}

export function formatearNumero(valor) {
  const numero = Number(valor);
  return formatoEntero.format(Number.isFinite(numero) ? numero : 0);
}

const formatoFechaHora = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });

function fechaValida(valor) {
  const fecha = valor ? new Date(valor) : null;
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null;
}

export function formatearFechaHora(valor) {
  const fecha = fechaValida(valor);
  return fecha ? formatoFechaHora.format(fecha) : '—';
}

export function formatearFecha(valor) {
  const fecha = fechaValida(valor);
  return fecha ? formatoFecha.format(fecha) : '—';
}

export function normalizarTexto(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const NIVELES_PRIORIDAD = [
  {
    desde: 75,
    etiqueta: 'Muy alta',
    clase:
      'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-400/30',
    barra: 'bg-red-600',
    color: '#dc2626',
  },
  {
    desde: 50,
    etiqueta: 'Alta',
    clase:
      'bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-400/30',
    barra: 'bg-orange-500',
    color: '#f97316',
  },
  {
    desde: 25,
    etiqueta: 'Media',
    clase:
      'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-400/30',
    barra: 'bg-amber-500',
    color: '#f59e0b',
  },
  {
    desde: 0,
    etiqueta: 'Baja',
    clase:
      'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20 dark:bg-green-950/60 dark:text-green-300 dark:ring-green-400/30',
    barra: 'bg-green-600',
    color: '#16a34a',
  },
];

export function nivelPrioridad(valor) {
  const puntaje = Number(valor);
  if (!Number.isFinite(puntaje)) return NIVELES_PRIORIDAD[NIVELES_PRIORIDAD.length - 1];
  return NIVELES_PRIORIDAD.find((nivel) => puntaje >= nivel.desde) ?? NIVELES_PRIORIDAD.at(-1);
}
