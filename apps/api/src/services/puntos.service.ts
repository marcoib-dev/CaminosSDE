import { prisma } from '../config/prisma.js';
import { ApiError } from '../core/ApiError.js';
import { registrarAuditoria } from '../core/auditoria.js';
import { assertDentroDeProvincia } from '../core/geo.js';
import * as repo from '../repositories/puntos.repository.js';

export async function listar(filtros: repo.FiltrosPuntos) {
  const filas = await repo.listarPuntos(filtros);
  return filas.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    categoria: fila.categoria,
    latitud: fila.latitud,
    longitud: fila.longitud,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
    categoriaPunto: {
      id: fila.catId,
      clave: fila.catClave,
      nombre: fila.catNombre,
      color: fila.catColor,
      inicial: fila.catInicial,
      peso: fila.catPeso,
      orden: fila.catOrden,
      protegida: fila.catProtegida,
    },
  }));
}

export async function crear(
  datos: { nombre: string; categoria: string; latitud: number; longitud: number },
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const categoria = await prisma.categoriaPunto.findUnique({ where: { clave: datos.categoria } });
  if (!categoria) throw new ApiError(400, 'La categoría indicada no existe.');
  assertDentroDeProvincia([[datos.longitud, datos.latitud]]);

  const punto = await repo.crearPunto(datos);
  await registrarAuditoria({
    usuarioId,
    accion: 'CREAR',
    entidad: 'PuntoInteres',
    entidadId: punto.id,
    detalle: { nombre: punto.nombre, categoria: punto.categoria },
    ip,
  });
  return { ...punto, categoriaPunto: categoria };
}

export async function actualizar(
  id: string,
  datos: { nombre?: string; categoria?: string; latitud?: number; longitud?: number },
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  if (datos.categoria) {
    const categoria = await prisma.categoriaPunto.findUnique({ where: { clave: datos.categoria } });
    if (!categoria) throw new ApiError(400, 'La categoría indicada no existe.');
  }
  if (datos.latitud !== undefined || datos.longitud !== undefined) {
    const actual = await prisma.puntoInteres.findUnique({
      where: { id },
      select: { latitud: true, longitud: true },
    });
    if (!actual) throw new ApiError(404, 'Punto de interés no encontrado.');
    assertDentroDeProvincia([
      [datos.longitud ?? actual.longitud, datos.latitud ?? actual.latitud],
    ]);
  }
  const punto = await repo.actualizarPunto(id, datos);
  await registrarAuditoria({
    usuarioId,
    accion: 'EDITAR',
    entidad: 'PuntoInteres',
    entidadId: id,
    detalle: { campos: Object.keys(datos) },
    ip,
  });
  return punto;
}

export async function eliminar(
  id: string,
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  await repo.eliminarPunto(id);
  await registrarAuditoria({ usuarioId, accion: 'BORRAR', entidad: 'PuntoInteres', entidadId: id, ip });
}

export const listarCategorias = repo.listarCategorias;
export async function crearCategoria(
  datos: { nombre: string; color?: string; inicial?: string; peso?: number; orden?: number },
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const categoria = await repo.crearCategoria(datos);
  await registrarAuditoria({
    usuarioId,
    accion: 'CREAR',
    entidad: 'CategoriaPunto',
    entidadId: categoria.id,
    detalle: { nombre: categoria.nombre },
    ip,
  });
  return categoria;
}

export async function eliminarCategoria(
  id: string,
  { usuarioId, ip }: { usuarioId?: string | null; ip?: string | null }
) {
  const resultado = await repo.eliminarCategoria(id);
  if (resultado.estado === 'no-existe') throw new ApiError(404, 'Categoría no encontrada.');
  if (resultado.estado === 'protegida') throw new ApiError(400, 'Las categorías base no se pueden eliminar.');
  if (resultado.estado === 'con-puntos') throw new ApiError(409, 'La categoría tiene puntos asociados.');
  await registrarAuditoria({ usuarioId, accion: 'BORRAR', entidad: 'CategoriaPunto', entidadId: id, ip });
}
