-- Create enums for socio profile normalization
CREATE TYPE "SocioEstado" AS ENUM (
  'ACTIVO',
  'INACTIVO',
  'SUSPENDIDO',
  'RETIRADO'
);

CREATE TYPE "TipoDocumento" AS ENUM (
  'CEDULA',
  'PASAPORTE',
  'RUC',
  'OTRO'
);

-- Add new normalized columns as nullable first
ALTER TABLE "Socio"
ADD COLUMN "tipoDocumento" "TipoDocumento",
ADD COLUMN "numeroDocumento" TEXT,
ADD COLUMN "telefono" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "direccion" TEXT,
ADD COLUMN "estado" "SocioEstado";

-- Backfill values from legacy structure
UPDATE "Socio"
SET
  "tipoDocumento" = 'CEDULA',
  "numeroDocumento" = CONCAT('TMP-', REPLACE("id", '-', '')),
  "telefono" = '0000000',
  "estado" = CASE WHEN "activo" THEN 'ACTIVO'::"SocioEstado" ELSE 'INACTIVO'::"SocioEstado" END
WHERE "tipoDocumento" IS NULL
   OR "numeroDocumento" IS NULL
   OR "telefono" IS NULL
   OR "estado" IS NULL;

-- Enforce not-null/default constraints after backfill
ALTER TABLE "Socio"
ALTER COLUMN "tipoDocumento" SET NOT NULL,
ALTER COLUMN "tipoDocumento" SET DEFAULT 'CEDULA',
ALTER COLUMN "numeroDocumento" SET NOT NULL,
ALTER COLUMN "telefono" SET NOT NULL,
ALTER COLUMN "estado" SET NOT NULL,
ALTER COLUMN "estado" SET DEFAULT 'ACTIVO';

-- Add uniqueness and performance indexes
CREATE UNIQUE INDEX "Socio_numeroDocumento_key" ON "Socio"("numeroDocumento");
CREATE UNIQUE INDEX "Socio_email_key" ON "Socio"("email");
CREATE INDEX "Socio_estado_idx" ON "Socio"("estado");
CREATE INDEX "Socio_tipoDocumento_numeroDocumento_idx" ON "Socio"("tipoDocumento", "numeroDocumento");

-- Replace old active-index and column
DROP INDEX IF EXISTS "Socio_activo_idx";
ALTER TABLE "Socio" DROP COLUMN "activo";

-- Basic profile integrity checks
ALTER TABLE "Socio"
ADD CONSTRAINT "Socio_numeroDocumento_not_blank_chk" CHECK (char_length(trim("numeroDocumento")) > 0),
ADD CONSTRAINT "Socio_telefono_not_blank_chk" CHECK (char_length(trim("telefono")) > 0);
