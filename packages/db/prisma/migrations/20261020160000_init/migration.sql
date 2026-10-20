-- PostGIS es requisito para las columnas geometry de core y vialidad.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "vialidad";

-- CreateEnum
CREATE TYPE "core"."Rol" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "core"."AccionAuditoria" AS ENUM ('CREAR', 'EDITAR', 'BORRAR', 'IMPORTAR', 'LOGIN');

-- CreateEnum
CREATE TYPE "vialidad"."EstadoSugerencia" AS ENUM ('PENDIENTE', 'REVISADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "vialidad"."TipoMantenimiento" AS ENUM ('PREVENTIVO', 'CORRECTIVO', 'MEJORA', 'OTRO');

-- CreateEnum
CREATE TYPE "vialidad"."TipoInfraestructura" AS ENUM ('ALCANTARILLA', 'PUENTE', 'TAPA');

-- CreateTable
CREATE TABLE "core"."Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "core"."Rol" NOT NULL DEFAULT 'EDITOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."Departamento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigoIndec" TEXT,
    "geom" geometry(Geometry, 4326),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."Capa" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "organismo" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Capa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."PermisoCapa" (
    "id" TEXT NOT NULL,
    "rol" "core"."Rol" NOT NULL,
    "capaId" TEXT NOT NULL,
    "puedeVer" BOOLEAN NOT NULL DEFAULT true,
    "puedeCrear" BOOLEAN NOT NULL DEFAULT false,
    "puedeEditar" BOOLEAN NOT NULL DEFAULT false,
    "puedeBorrar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PermisoCapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" "core"."AccionAuditoria" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."OperacionSync" (
    "id" TEXT NOT NULL,
    "operacionId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" TEXT NOT NULL,
    "resultado" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperacionSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."CategoriaPunto" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#0e7490',
    "inicial" TEXT NOT NULL,
    "peso" INTEGER NOT NULL DEFAULT 10,
    "orden" INTEGER NOT NULL DEFAULT 100,
    "protegida" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaPunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."PuntoInteres" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "geom" geometry(Point, 4326),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuntoInteres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."TipoVia" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 100,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoVia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."EstadoTramo" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 100,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoTramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."Camino" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "tipoViaId" TEXT NOT NULL,
    "departamentoId" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "geom" geometry(LineString, 4326),
    "longitudKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Camino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."Tramo" (
    "id" TEXT NOT NULL,
    "caminoId" TEXT NOT NULL,
    "geom" geometry(LineString, 4326),
    "longitudKm" DOUBLE PRECISION NOT NULL,
    "estadoId" TEXT NOT NULL,
    "observaciones" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."HistorialTramo" (
    "id" TEXT NOT NULL,
    "tramoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "estadoAnteriorId" TEXT NOT NULL,
    "estadoNuevoId" TEXT NOT NULL,
    "geometriaAnterior" JSONB,
    "geometriaNuevo" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialTramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."Mantenimiento" (
    "id" TEXT NOT NULL,
    "tramoId" TEXT NOT NULL,
    "tipo" "vialidad"."TipoMantenimiento" NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "costo" DOUBLE PRECISION,
    "usuarioId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."Foto" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "caminoId" TEXT NOT NULL,
    "tramoId" TEXT,
    "mantenimientoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."Infraestructura" (
    "id" TEXT NOT NULL,
    "tipo" "vialidad"."TipoInfraestructura" NOT NULL,
    "geom" geometry(Point, 4326) NOT NULL,
    "descripcion" TEXT,
    "caminoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Infraestructura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vialidad"."Sugerencia" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "contacto" TEXT,
    "estado" "vialidad"."EstadoSugerencia" NOT NULL DEFAULT 'PENDIENTE',
    "caminoId" TEXT,
    "tramoId" TEXT,
    "revisadoPorId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sugerencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "core"."Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "core"."Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "core"."Usuario"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "core"."RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_usuarioId_idx" ON "core"."RefreshToken"("usuarioId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiraEn_idx" ON "core"."RefreshToken"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nombre_key" ON "core"."Departamento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Capa_clave_key" ON "core"."Capa"("clave");

-- CreateIndex
CREATE INDEX "PermisoCapa_rol_idx" ON "core"."PermisoCapa"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "PermisoCapa_rol_capaId_key" ON "core"."PermisoCapa"("rol", "capaId");

-- CreateIndex
CREATE INDEX "Auditoria_fecha_idx" ON "core"."Auditoria"("fecha");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_idx" ON "core"."Auditoria"("entidad");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "core"."Auditoria"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "OperacionSync_operacionId_key" ON "core"."OperacionSync"("operacionId");

-- CreateIndex
CREATE INDEX "OperacionSync_creadoEn_idx" ON "core"."OperacionSync"("creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaPunto_clave_key" ON "core"."CategoriaPunto"("clave");

-- CreateIndex
CREATE INDEX "CategoriaPunto_orden_idx" ON "core"."CategoriaPunto"("orden");

-- CreateIndex
CREATE INDEX "PuntoInteres_categoria_idx" ON "core"."PuntoInteres"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "TipoVia_clave_key" ON "vialidad"."TipoVia"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoTramo_clave_key" ON "vialidad"."EstadoTramo"("clave");

-- CreateIndex
CREATE INDEX "Camino_departamentoId_idx" ON "vialidad"."Camino"("departamentoId");

-- CreateIndex
CREATE INDEX "Camino_tipoViaId_idx" ON "vialidad"."Camino"("tipoViaId");

-- CreateIndex
CREATE INDEX "Camino_activo_idx" ON "vialidad"."Camino"("activo");

-- CreateIndex
CREATE INDEX "Camino_nombre_idx" ON "vialidad"."Camino"("nombre");

-- CreateIndex
CREATE INDEX "Tramo_caminoId_idx" ON "vialidad"."Tramo"("caminoId");

-- CreateIndex
CREATE INDEX "Tramo_estadoId_idx" ON "vialidad"."Tramo"("estadoId");

-- CreateIndex
CREATE INDEX "HistorialTramo_tramoId_idx" ON "vialidad"."HistorialTramo"("tramoId");

-- CreateIndex
CREATE INDEX "HistorialTramo_fecha_idx" ON "vialidad"."HistorialTramo"("fecha");

-- CreateIndex
CREATE INDEX "Mantenimiento_tramoId_idx" ON "vialidad"."Mantenimiento"("tramoId");

-- CreateIndex
CREATE INDEX "Mantenimiento_fecha_idx" ON "vialidad"."Mantenimiento"("fecha");

-- CreateIndex
CREATE INDEX "Foto_caminoId_idx" ON "vialidad"."Foto"("caminoId");

-- CreateIndex
CREATE INDEX "Foto_tramoId_idx" ON "vialidad"."Foto"("tramoId");

-- CreateIndex
CREATE INDEX "Foto_mantenimientoId_idx" ON "vialidad"."Foto"("mantenimientoId");

-- CreateIndex
CREATE INDEX "Infraestructura_caminoId_idx" ON "vialidad"."Infraestructura"("caminoId");

-- CreateIndex
CREATE INDEX "Infraestructura_tipo_idx" ON "vialidad"."Infraestructura"("tipo");

-- CreateIndex
CREATE INDEX "Sugerencia_estado_idx" ON "vialidad"."Sugerencia"("estado");

-- CreateIndex
CREATE INDEX "Sugerencia_caminoId_idx" ON "vialidad"."Sugerencia"("caminoId");

-- CreateIndex
CREATE INDEX "Sugerencia_tramoId_idx" ON "vialidad"."Sugerencia"("tramoId");

-- AddForeignKey
ALTER TABLE "core"."RefreshToken" ADD CONSTRAINT "RefreshToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "core"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."PermisoCapa" ADD CONSTRAINT "PermisoCapa_capaId_fkey" FOREIGN KEY ("capaId") REFERENCES "core"."Capa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "core"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."PuntoInteres" ADD CONSTRAINT "PuntoInteres_categoria_fkey" FOREIGN KEY ("categoria") REFERENCES "core"."CategoriaPunto"("clave") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Camino" ADD CONSTRAINT "Camino_tipoViaId_fkey" FOREIGN KEY ("tipoViaId") REFERENCES "vialidad"."TipoVia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Camino" ADD CONSTRAINT "Camino_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "core"."Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Tramo" ADD CONSTRAINT "Tramo_caminoId_fkey" FOREIGN KEY ("caminoId") REFERENCES "vialidad"."Camino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Tramo" ADD CONSTRAINT "Tramo_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "vialidad"."EstadoTramo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."HistorialTramo" ADD CONSTRAINT "HistorialTramo_tramoId_fkey" FOREIGN KEY ("tramoId") REFERENCES "vialidad"."Tramo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."HistorialTramo" ADD CONSTRAINT "HistorialTramo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "core"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."HistorialTramo" ADD CONSTRAINT "HistorialTramo_estadoAnteriorId_fkey" FOREIGN KEY ("estadoAnteriorId") REFERENCES "vialidad"."EstadoTramo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."HistorialTramo" ADD CONSTRAINT "HistorialTramo_estadoNuevoId_fkey" FOREIGN KEY ("estadoNuevoId") REFERENCES "vialidad"."EstadoTramo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Mantenimiento" ADD CONSTRAINT "Mantenimiento_tramoId_fkey" FOREIGN KEY ("tramoId") REFERENCES "vialidad"."Tramo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Mantenimiento" ADD CONSTRAINT "Mantenimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "core"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Foto" ADD CONSTRAINT "Foto_caminoId_fkey" FOREIGN KEY ("caminoId") REFERENCES "vialidad"."Camino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Foto" ADD CONSTRAINT "Foto_tramoId_fkey" FOREIGN KEY ("tramoId") REFERENCES "vialidad"."Tramo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Foto" ADD CONSTRAINT "Foto_mantenimientoId_fkey" FOREIGN KEY ("mantenimientoId") REFERENCES "vialidad"."Mantenimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Infraestructura" ADD CONSTRAINT "Infraestructura_caminoId_fkey" FOREIGN KEY ("caminoId") REFERENCES "vialidad"."Camino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Sugerencia" ADD CONSTRAINT "Sugerencia_caminoId_fkey" FOREIGN KEY ("caminoId") REFERENCES "vialidad"."Camino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Sugerencia" ADD CONSTRAINT "Sugerencia_tramoId_fkey" FOREIGN KEY ("tramoId") REFERENCES "vialidad"."Tramo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vialidad"."Sugerencia" ADD CONSTRAINT "Sugerencia_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "core"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Índices espaciales GiST (no generados por Prisma por usar Unsupported)
CREATE INDEX IF NOT EXISTS "Departamento_geom_gist" ON "core"."Departamento" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "PuntoInteres_geom_gist" ON "core"."PuntoInteres" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "Camino_geom_gist" ON "vialidad"."Camino" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "Tramo_geom_gist" ON "vialidad"."Tramo" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "Infraestructura_geom_gist" ON "vialidad"."Infraestructura" USING GIST ("geom");
