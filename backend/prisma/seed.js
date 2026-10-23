import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as turf from '@turf/turf';
import { RONDAS_BCRYPT } from '../src/config/seguridad.js';

const prisma = new PrismaClient();

const longitudKm = (geometria) => {
  const km = turf.length(turf.lineString(geometria.coordinates), { units: 'kilometers' });
  return Math.round(km * 1000) / 1000;
};

const tramo = (coordinates, estado, tipo, observaciones = null) => {
  const geometria = { type: 'LineString', coordinates };
  return {
    geometria,
    longitudKm: longitudKm(geometria),
    estado,
    tipo,
    observaciones,
  };
};

const puntosDemo = [
  {
    nombre: 'Hospital Zonal de Añatuya',
    categoria: 'HOSPITAL',
    latitud: -28.46,
    longitud: -62.83,
  },
  {
    nombre: 'Escuela Rural N° 1.024',
    categoria: 'ESCUELA',
    latitud: -28.98,
    longitud: -63.44,
  },
  {
    nombre: 'UPA Villa Atamisqui',
    categoria: 'UPA',
    latitud: -28.5,
    longitud: -63.66,
  },
];

const categoriasBase = [
  { clave: 'HOSPITAL', nombre: 'Hospital', color: '#dc2626', inicial: 'H', peso: 30, orden: 1 },
  { clave: 'ESCUELA', nombre: 'Escuela', color: '#d97706', inicial: 'E', peso: 15, orden: 2 },
  { clave: 'UPA', nombre: 'UPA', color: '#2563eb', inicial: 'U', peso: 20, orden: 3 },
];

const caminosDemo = [
  {
    nombre: 'Ruta Provincial 5 - Acceso a Villa Atamisqui',
    localidad: 'Villa Atamisqui',
    departamento: 'Atamisqui',
    descripcion: 'Camino de acceso principal desde la ruta provincial hasta la localidad.',
    tramos: [
      tramo(
        [
          [-63.675, -28.495],
          [-63.662, -28.503],
          [-63.648, -28.512],
        ],
        'TRANSITABLE',
        'PAVIMENTADO',
        'Primer tramo asfaltado en buen estado.'
      ),
      tramo(
        [
          [-63.648, -28.512],
          [-63.635, -28.521],
          [-63.623, -28.53],
        ],
        'INTRANSITABLE',
        'TIERRA',
        'Tramo con numerosos baches y anegamientos tras las lluvias.'
      ),
    ],
  },
  {
    nombre: 'Camino rural a Los Telares',
    localidad: 'Los Telares',
    departamento: 'Salavina',
    descripcion: 'Vincula la planta urbana con los parajes del norte del departamento.',
    tramos: [
      tramo(
        [
          [-63.452, -28.972],
          [-63.441, -28.981],
          [-63.43, -28.989],
        ],
        'REGULAR',
        'RIPIO',
        'Requiere mantenimiento periódico por el tránsito de camiones.'
      ),
      tramo(
        [
          [-63.43, -28.989],
          [-63.418, -28.997],
          [-63.406, -29.006],
        ],
        'EN_OBRA',
        'TIERRA',
        'Trabajos de enripiado en ejecución.'
      ),
    ],
  },
  {
    nombre: 'Acceso norte a Añatuya',
    localidad: 'Añatuya',
    departamento: 'General Taboada',
    descripcion: 'Camino de conexión entre la zona rural y el hospital zonal.',
    tramos: [
      tramo(
        [
          [-62.839, -28.452],
          [-62.828, -28.46],
          [-62.816, -28.469],
        ],
        'TRANSITABLE',
        'ENRIPIADO_MEJORADO',
        'Superficie consolidada y transitable todo el año.'
      ),
      tramo(
        [
          [-62.816, -28.469],
          [-62.804, -28.478],
          [-62.792, -28.487],
        ],
        'INTRANSITABLE',
        'TIERRA',
        'Sector sin mantenimiento, intransitable con lluvias.'
      ),
    ],
  },
];

async function main() {
  const nombreAdmin = process.env.ADMIN_NOMBRE ?? 'Administrador';
  const emailAdmin = process.env.ADMIN_EMAIL;
  const passwordAdmin = process.env.ADMIN_PASSWORD;

  if (!emailAdmin || !passwordAdmin) {
    throw new Error(
      'Definí ADMIN_EMAIL y ADMIN_PASSWORD en el archivo .env para crear el usuario administrador.'
    );
  }

  const passwordHash = await bcrypt.hash(passwordAdmin, RONDAS_BCRYPT);

  const admin = await prisma.usuario.upsert({
    where: { email: emailAdmin.toLowerCase() },
    update: { rol: 'ADMIN', activo: true },
    create: {
      nombre: nombreAdmin,
      email: emailAdmin.toLowerCase(),
      passwordHash,
      rol: 'ADMIN',
      activo: true,
    },
  });

  console.log(`Usuario ADMIN disponible: ${admin.email}`);

  for (const categoria of categoriasBase) {
    await prisma.categoriaPunto.upsert({
      where: { clave: categoria.clave },
      update: {
        nombre: categoria.nombre,
        color: categoria.color,
        inicial: categoria.inicial,
        peso: categoria.peso,
        orden: categoria.orden,
        protegida: true,
      },
      create: { ...categoria, protegida: true },
    });
  }

  if (process.env.SEED_SIN_DEMO === 'true') {
    console.log('Datos de ejemplo omitidos (SEED_SIN_DEMO=true).');
    return;
  }

  for (const datos of caminosDemo) {
    const existente = await prisma.camino.findFirst({
      where: { nombre: datos.nombre, departamento: datos.departamento },
      select: { id: true },
    });

    if (existente) {
      console.log(`Camino ya existente, se omite: ${datos.nombre}`);
      continue;
    }

    const { tramos, ...camino } = datos;

    await prisma.camino.create({
      data: {
        ...camino,
        tramos: { create: tramos },
      },
    });

    console.log(`Camino creado: ${datos.nombre} (${tramos.length} tramos)`);
  }

  for (const punto of puntosDemo) {
    const existente = await prisma.puntoInteres.findFirst({
      where: { nombre: punto.nombre, categoria: punto.categoria },
      select: { id: true },
    });

    if (existente) {
      console.log(`Punto de interés ya existente, se omite: ${punto.nombre}`);
      continue;
    }

    await prisma.puntoInteres.create({ data: punto });
    console.log(`Punto de interés creado: ${punto.nombre}`);
  }
}

main()
  .catch((error) => {
    console.error('Error al ejecutar el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
