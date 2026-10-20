import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...clases: ClassValue[]) => twMerge(clsx(clases));

export const formatearKm = (km: number) => `${km.toLocaleString('es-AR', { maximumFractionDigits: 2 })} km`;

export const formatearFecha = (fecha: string | Date) =>
  new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(fecha));

export const formatearFechaHora = (fecha: string | Date) =>
  new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fecha));

export const formatearMoneda = (valor: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);

export const bboxDeMapa = (mapa: import('leaflet').Map): [number, number, number, number] => {
  const bounds = mapa.getBounds();
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
};
