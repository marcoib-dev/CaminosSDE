import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TIPOS_VIA = [
  { clave: 'RUTA', nombre: 'Ruta', descripcion: 'Ruta provincial o nacional', orden: 10 },
  { clave: 'CAMINO_RURAL', nombre: 'Camino rural', descripcion: 'Camino de tierra o ripio', orden: 20 },
  { clave: 'CALLE', nombre: 'Calle', descripcion: 'Vía urbana', orden: 30 },
];

const ESTADOS = [
  { clave: 'TRANSITABLE', nombre: 'Transitable', colorHex: '#16a34a', orden: 10 },
  { clave: 'REGULAR', nombre: 'Regular', colorHex: '#eab308', orden: 20 },
  { clave: 'INTRANSITABLE', nombre: 'Intransitable', colorHex: '#dc2626', orden: 30 },
  { clave: 'EN_OBRA', nombre: 'En obra', colorHex: '#2563eb', orden: 40 },
];

const CAPAS = [
  { clave: 'CAMINOS', nombre: 'Caminos', organismo: 'Vialidad' },
  { clave: 'TRAMOS', nombre: 'Tramos', organismo: 'Vialidad' },
  { clave: 'MANTENIMIENTOS', nombre: 'Mantenimientos', organismo: 'Vialidad' },
  { clave: 'INFRAESTRUCTURA', nombre: 'Infraestructura puntual', organismo: 'Vialidad' },
  { clave: 'PUNTOS_INTERES', nombre: 'Puntos de interés', organismo: 'Core' },
  { clave: 'FOTOS', nombre: 'Fotos', organismo: 'Vialidad' },
  { clave: 'SUGERENCIAS', nombre: 'Sugerencias', organismo: 'Core' },
];

const DEPARTAMENTOS = [
  'Aguirre', 'Alberdi', 'Atamisqui', 'Avellaneda', 'Banda', 'Belgrano',
  'Capital', 'Choya', 'Copo', 'Figueroa', 'General Taboada', 'Guasayán',
  'Jiménez', 'Juan Felipe Ibarra', 'Loreto', 'Mitre', 'Moreno', 'Ojo de Agua',
  'Pellegrini', 'Quebrachos', 'Río Hondo', 'Rivadavia', 'Robles', 'Salavina',
  'San Martín', 'Sarmiento', 'Silípica',
];

const CATEGORIAS = [
  { clave: 'HOSPITAL', nombre: 'Hospital', color: '#dc2626', inicial: 'H', peso: 30, orden: 10, protegida: true },
  { clave: 'ESCUELA', nombre: 'Escuela', color: '#2563eb', inicial: 'E', peso: 15, orden: 20, protegida: true },
  { clave: 'UPA', nombre: 'UPA', color: '#0d9488', inicial: 'U', peso: 20, orden: 30, protegida: true },
];

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@ejemplo.com';
  const password = process.env.ADMIN_PASSWORD ?? 'Cambiar123!';
  const nombreAdmin = process.env.ADMIN_NOMBRE ?? 'Administrador';

  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nombre: nombreAdmin,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      rol: 'ADMIN',
    },
  });

  for (const tipo of TIPOS_VIA) {
    await prisma.tipoVia.upsert({
      where: { clave: tipo.clave },
      update: { nombre: tipo.nombre, descripcion: tipo.descripcion, orden: tipo.orden },
      create: tipo,
    });
  }

  for (const estado of ESTADOS) {
    await prisma.estadoTramo.upsert({
      where: { clave: estado.clave },
      update: { nombre: estado.nombre, colorHex: estado.colorHex, orden: estado.orden },
      create: estado,
    });
  }

  for (const depto of DEPARTAMENTOS) {
    await prisma.departamento.upsert({
      where: { nombre: depto },
      update: {},
      create: { nombre: depto },
    });
  }

  for (const categoria of CATEGORIAS) {
    await prisma.categoriaPunto.upsert({
      where: { clave: categoria.clave },
      update: { nombre: categoria.nombre, color: categoria.color, inicial: categoria.inicial, peso: categoria.peso, orden: categoria.orden },
      create: categoria,
    });
  }

  for (const capa of CAPAS) {
    const creada = await prisma.capa.upsert({
      where: { clave: capa.clave },
      update: { nombre: capa.nombre, organismo: capa.organismo },
      create: capa,
    });

    const esSugerencia = capa.clave === 'SUGERENCIAS';
    await prisma.permisoCapa.upsert({
      where: { rol_capaId: { rol: 'ADMIN', capaId: creada.id } },
      update: { puedeVer: true, puedeCrear: true, puedeEditar: true, puedeBorrar: true },
      create: { rol: 'ADMIN', capaId: creada.id, puedeVer: true, puedeCrear: true, puedeEditar: true, puedeBorrar: true },
    });
    await prisma.permisoCapa.upsert({
      where: { rol_capaId: { rol: 'EDITOR', capaId: creada.id } },
      update: { puedeVer: true, puedeCrear: !esSugerencia, puedeEditar: true, puedeBorrar: !esSugerencia },
      create: { rol: 'EDITOR', capaId: creada.id, puedeVer: true, puedeCrear: !esSugerencia, puedeEditar: true, puedeBorrar: !esSugerencia },
    });
  }

  const tipoRural = await prisma.tipoVia.findUniqueOrThrow({ where: { clave: 'CAMINO_RURAL' } });
  const estados = Object.fromEntries(
    (await prisma.estadoTramo.findMany()).map((e) => [e.clave, e.id])
  ) as Record<string, string>;
  const deptos = Object.fromEntries(
    (await prisma.departamento.findMany()).map((d) => [d.nombre, d.id])
  ) as Record<string, string>;

  const caminosDemo = [
    {
      id: 'seed_camino_telares',
      nombre: 'Camino rural a Los Telares',
      localidad: 'Los Telares',
      departamento: 'Salavina',
      descripcion: 'Vincula la planta urbana con los parajes del norte.',
      geom: { type: 'LineString', coordinates: [[-63.45, -28.97], [-63.44, -28.98], [-63.43, -28.989]] },
      tramos: [
        { id: 'seed_tramo_telares_1', desde: 0, hasta: 0.5, estado: 'TRANSITABLE', obs: 'Sin novedades.' },
        { id: 'seed_tramo_telares_2', desde: 0.5, hasta: 1, estado: 'INTRANSITABLE', obs: 'Sector sin mantenimiento.' },
      ],
    },
    {
      id: 'seed_camino_anatuya',
      nombre: 'Camino a Añatuya',
      localidad: 'Añatuya',
      departamento: 'General Taboada',
      descripcion: 'Acceso principal desde la ruta provincial.',
      geom: { type: 'LineString', coordinates: [[-62.85, -28.47], [-62.84, -28.465], [-62.83, -28.46]] },
      tramos: [{ id: 'seed_tramo_anatuya_1', desde: 0, hasta: 1, estado: 'REGULAR', obs: 'Ripio en buen estado.' }],
    },
    {
      id: 'seed_camino_termas',
      nombre: 'Camino a Termas de Río Hondo',
      localidad: 'Termas de Río Hondo',
      departamento: 'Río Hondo',
      descripcion: 'Camino de acceso al paraje El Charco.',
      geom: { type: 'LineString', coordinates: [[-64.87, -27.5], [-64.86, -27.495], [-64.85, -27.49]] },
      tramos: [{ id: 'seed_tramo_termas_1', desde: 0, hasta: 1, estado: 'EN_OBRA', obs: 'Trabajos de enripiado.' }],
    },
  ];

  for (const camino of caminosDemo) {
    const deptoId = deptos[camino.departamento] ?? null;
    const geoJson = JSON.stringify(camino.geom);
    await prisma.$executeRaw`
      INSERT INTO vialidad."Camino"
        (id, nombre, localidad, "tipoViaId", "departamentoId", descripcion, activo, geom, "longitudKm", version, "creadoEn", "actualizadoEn")
      VALUES
        (${camino.id}, ${camino.nombre}, ${camino.localidad}, ${tipoRural.id}, ${deptoId}, ${camino.descripcion}, true,
         ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326),
         ST_Length(ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326)::geography) / 1000,
         1, now(), now())
      ON CONFLICT (id) DO NOTHING
    `;

    for (const tramo of camino.tramos) {
      await prisma.$executeRaw`
        INSERT INTO vialidad."Tramo"
          (id, "caminoId", geom, "longitudKm", "estadoId", observaciones, version, "creadoEn", "actualizadoEn")
        SELECT ${tramo.id}, ${camino.id}, g,
               ST_Length(g::geography) / 1000,
               ${estados[tramo.estado]}, ${tramo.obs}, 1, now(), now()
        FROM (
          SELECT ST_LineSubstring(geom, ${tramo.desde}, ${tramo.hasta}) AS g
          FROM vialidad."Camino" WHERE id = ${camino.id}
        ) s
        WHERE ST_GeometryType(g) = 'ST_LineString'
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  const puntos = [
    { id: 'seed_poi_hospital', nombre: 'Hospital Zonal de Añatuya', categoria: 'HOSPITAL', lat: -28.461, lng: -62.831 },
    { id: 'seed_poi_escuela', nombre: 'Escuela N° 1 de Los Telares', categoria: 'ESCUELA', lat: -28.981, lng: -63.442 },
    { id: 'seed_poi_upa', nombre: 'UPA Termas de Río Hondo', categoria: 'UPA', lat: -27.492, lng: -64.861 },
  ];
  for (const punto of puntos) {
    await prisma.$executeRaw`
      INSERT INTO core."PuntoInteres"
        (id, nombre, categoria, latitud, longitud, geom, "creadoEn", "actualizadoEn")
      VALUES
        (${punto.id}, ${punto.nombre}, ${punto.categoria}, ${punto.lat}, ${punto.lng},
         ST_SetSRID(ST_MakePoint(${punto.lng}, ${punto.lat}), 4326), now(), now())
      ON CONFLICT (id) DO NOTHING
    `;
  }

  const infra = [
    { id: 'seed_infra_1', tipo: 'ALCANTARILLA', lng: -63.435, lat: -28.985, desc: 'Alcantarilla sobre el brazo norte.' },
    { id: 'seed_infra_2', tipo: 'PUENTE', lng: -62.842, lat: -28.468, desc: 'Puente de hormigón.' },
  ];
  for (const item of infra) {
    await prisma.$executeRaw`
      INSERT INTO vialidad."Infraestructura" (id, tipo, geom, descripcion, "creadoEn")
      VALUES (${item.id}, ${item.tipo}::vialidad."TipoInfraestructura",
              ST_SetSRID(ST_MakePoint(${item.lng}, ${item.lat}), 4326), ${item.desc}, now())
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log('Seed completado.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
