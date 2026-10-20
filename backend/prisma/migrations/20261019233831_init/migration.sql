-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "EstadoTramo" AS ENUM ('TRANSITABLE', 'REGULAR', 'INTRANSITABLE', 'EN_OBRA');

-- CreateEnum
CREATE TYPE "TipoSuperficie" AS ENUM ('TIERRA', 'RIPIO', 'ENRIPIADO_MEJORADO', 'PAVIMENTADO');

-- CreateEnum
CREATE TYPE "CategoriaPuntoInteres" AS ENUM ('HOSPITAL', 'ESCUELA', 'UPA');

-- CreateEnum
CREATE TYPE "EstadoSugerencia" AS ENUM ('PENDIENTE', 'REVISADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREAR', 'EDITAR', 'BORRAR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'EDITOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camino" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Camino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tramo" (
    "id" TEXT NOT NULL,
    "caminoId" TEXT NOT NULL,
    "geometria" JSONB NOT NULL,
    "longitudKm" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoTramo" NOT NULL,
    "tipo" "TipoSuperficie" NOT NULL,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialTramo" (
    "id" TEXT NOT NULL,
    "tramoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "estadoAnterior" "EstadoTramo" NOT NULL,
    "tipoAnterior" "TipoSuperficie" NOT NULL,
    "geometriaAnterior" JSONB NOT NULL,
    "estadoNuevo" "EstadoTramo" NOT NULL,
    "tipoNuevo" "TipoSuperficie" NOT NULL,
    "geometriaNuevo" JSONB NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialTramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuntoInteres" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaPuntoInteres" NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuntoInteres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "caminoId" TEXT NOT NULL,
    "tramoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sugerencia" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "contacto" TEXT,
    "estado" "EstadoSugerencia" NOT NULL DEFAULT 'PENDIENTE',
    "caminoId" TEXT,
    "tramoId" TEXT,
    "revisadoPorId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sugerencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" "AccionAuditoria" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");

-- CreateIndex
CREATE INDEX "Camino_departamento_idx" ON "Camino"("departamento");

-- CreateIndex
CREATE INDEX "Camino_activo_idx" ON "Camino"("activo");

-- CreateIndex
CREATE INDEX "Camino_nombre_idx" ON "Camino"("nombre");

-- CreateIndex
CREATE INDEX "Tramo_caminoId_idx" ON "Tramo"("caminoId");

-- CreateIndex
CREATE INDEX "Tramo_estado_idx" ON "Tramo"("estado");

-- CreateIndex
CREATE INDEX "Tramo_tipo_idx" ON "Tramo"("tipo");

-- CreateIndex
CREATE INDEX "HistorialTramo_tramoId_idx" ON "HistorialTramo"("tramoId");

-- CreateIndex
CREATE INDEX "HistorialTramo_fecha_idx" ON "HistorialTramo"("fecha");

-- CreateIndex
CREATE INDEX "PuntoInteres_categoria_idx" ON "PuntoInteres"("categoria");

-- CreateIndex
CREATE INDEX "Foto_caminoId_idx" ON "Foto"("caminoId");

-- CreateIndex
CREATE INDEX "Foto_tramoId_idx" ON "Foto"("tramoId");

-- CreateIndex
CREATE INDEX "Sugerencia_estado_idx" ON "Sugerencia"("estado");

-- CreateIndex
CREATE INDEX "Sugerencia_caminoId_idx" ON "Sugerencia"("caminoId");

-- CreateIndex
CREATE INDEX "Sugerencia_tramoId_idx" ON "Sugerencia"("tramoId");

-- CreateIndex
CREATE INDEX "Auditoria_fecha_idx" ON "Auditoria"("fecha");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_idx" ON "Auditoria"("entidad");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- AddForeignKey
ALTER TABLE "Tramo" ADD CONSTRAINT "Tramo_caminoId_fkey" FOREIGN KEY ("caminoId") REFERENCES "Camino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialTramo" ADD CONSTRAINT "HistorialTramo_tramoId_fkey" FOREIGN KEY ("tramoId") REFERENCES "Tramo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialTramo" ADD CONSTRAINT "HistorialTramo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_caminoId_fkey" FOREIGN KEY ("caminoId") REFERENCES "Camino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_tramoId_fkey" FOREIGN KEY ("tramoId") REFERENCES "Tramo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sugerencia" ADD CONSTRAINT "Sugerencia_caminoId_fkey" FOREIGN KEY ("caminoId") REFERENCES "Camino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sugerencia" ADD CONSTRAINT "Sugerencia_tramoId_fkey" FOREIGN KEY ("tramoId") REFERENCES "Tramo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sugerencia" ADD CONSTRAINT "Sugerencia_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
