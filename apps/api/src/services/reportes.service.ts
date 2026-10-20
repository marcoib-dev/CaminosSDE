import * as repo from '../repositories/reportes.repository.js';

export const kmPorEstado = (departamentoId?: string) => repo.kmPorEstado(departamentoId);
export const kmPorDepartamento = () => repo.kmPorDepartamento();
export const mantenimientosAnuales = (anio: number) => repo.mantenimientosAnuales(anio);
export const resumenGeneral = () => repo.resumenGeneral();
