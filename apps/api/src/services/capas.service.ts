import { prisma } from '../config/prisma.js';
import type { Rol } from '@prisma/client';

export async function listar() {
  // El panel de administración necesita ver también las capas inactivas para reactivarlas.
  return prisma.capa.findMany({ orderBy: [{ activa: 'desc' }, { nombre: 'asc' }] });
}

export async function permitidas(rol: Rol) {
  const permisos = await prisma.permisoCapa.findMany({
    where: { rol, capa: { activa: true }, puedeVer: true },
    include: { capa: true },
  });
  return permisos.map((permiso) => ({
    ...permiso.capa,
    permisos: {
      ver: permiso.puedeVer,
      crear: permiso.puedeCrear,
      editar: permiso.puedeEditar,
      borrar: permiso.puedeBorrar,
    },
  }));
}

export async function crear(datos: { clave: string; nombre: string; organismo: string; activa?: boolean }) {
  const capa = await prisma.capa.create({
    data: { ...datos, activa: datos.activa ?? true },
  });
  await prisma.permisoCapa.createMany({
    data: [
      { rol: 'ADMIN', capaId: capa.id, puedeVer: true, puedeCrear: true, puedeEditar: true, puedeBorrar: true },
      { rol: 'EDITOR', capaId: capa.id, puedeVer: true },
    ],
  });
  return capa;
}

export async function actualizar(
  id: string,
  datos: { nombre?: string; organismo?: string; activa?: boolean }
) {
  return prisma.capa.update({ where: { id }, data: datos });
}
