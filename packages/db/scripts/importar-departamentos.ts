/**
 * Importa departamentos desde un GeoJSON (FeatureCollection de Polygon/MultiPolygon).
 * Uso: pnpm --filter @sde/db importar-departamentos -- --archivo ../datos/departamentos.geojson
 */
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argumento(nombre: string) {
  const indice = process.argv.indexOf(nombre);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

async function main() {
  const archivo = argumento('--archivo');
  if (!archivo) {
    console.error('Falta --archivo <ruta.geojson>');
    process.exit(1);
  }

  const contenido = JSON.parse(await readFile(archivo, 'utf8'));
  const features = contenido.features ?? [];
  let importados = 0;

  for (const feature of features) {
    const nombre =
      feature.properties?.nombre ?? feature.properties?.name ?? feature.properties?.departamento;
    if (!nombre || !feature.geometry) continue;

    const existente = await prisma.departamento.findUnique({ where: { nombre } });
    const id = existente?.id ?? `depto_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    await prisma.$executeRaw`
      INSERT INTO core."Departamento" (id, nombre, geom, "creadoEn", "actualizadoEn")
      VALUES (${id}, ${nombre}, ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}), 4326), now(), now())
      ON CONFLICT (nombre) DO UPDATE SET geom = EXCLUDED.geom, "actualizadoEn" = now()
    `;
    importados += 1;
  }

  console.log(`Departamentos importados: ${importados}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
