-- CreateTable
CREATE TABLE "CategoriaPunto" (
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

-- Categorías base que ya existían como enum
INSERT INTO "CategoriaPunto" ("id", "clave", "nombre", "color", "inicial", "peso", "orden", "protegida", "creadoEn", "actualizadoEn")
VALUES
    ('cat_hospital', 'HOSPITAL', 'Hospital', '#dc2626', 'H', 30, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat_escuela', 'ESCUELA', 'Escuela', '#d97706', 'E', 15, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat_upa', 'UPA', 'UPA', '#2563eb', 'U', 20, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "PuntoInteres" ALTER COLUMN "categoria" TYPE TEXT USING ("categoria"::text);

-- DropEnum
DROP TYPE "CategoriaPuntoInteres";

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaPunto_clave_key" ON "CategoriaPunto"("clave");

-- CreateIndex
CREATE INDEX "CategoriaPunto_orden_idx" ON "CategoriaPunto"("orden");

-- AddForeignKey
ALTER TABLE "PuntoInteres" ADD CONSTRAINT "PuntoInteres_categoria_fkey" FOREIGN KEY ("categoria") REFERENCES "CategoriaPunto"("clave") ON DELETE RESTRICT ON UPDATE CASCADE;
