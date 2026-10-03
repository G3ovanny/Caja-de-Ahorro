-- AlterEnum MovimientoTipo
DO $$ BEGIN
  ALTER TYPE "MovimientoTipo" ADD VALUE 'RENDIMIENTO_AHORRO';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum MovimientoReferenciaTipo (antes era TEXT en Movimiento.referenciaTipo)
DO $$ BEGIN
  CREATE TYPE "MovimientoReferenciaTipo" AS ENUM (
    'AHORRO',
    'PRESTAMO',
    'PAGO_PRESTAMO',
    'RETIRO',
    'AJUSTE',
    'CIERRE_INTERES'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Convertir columna TEXT -> enum (idempotente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Movimiento'
      AND column_name = 'referenciaTipo'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE "Movimiento"
      ALTER COLUMN "referenciaTipo" TYPE "MovimientoReferenciaTipo"
      USING (
        CASE
          WHEN "referenciaTipo" IS NULL THEN NULL
          WHEN "referenciaTipo" IN (
            'AHORRO',
            'PRESTAMO',
            'PAGO_PRESTAMO',
            'RETIRO',
            'AJUSTE',
            'CIERRE_INTERES'
          ) THEN "referenciaTipo"::"MovimientoReferenciaTipo"
          ELSE NULL
        END
      );
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CierreInteresEstado" AS ENUM ('APLICADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CierreInteresMensual" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "interesBruto" DECIMAL(12,2) NOT NULL,
    "porcentajeEmpresa" DECIMAL(5,2) NOT NULL,
    "porcentajeSocios" DECIMAL(5,2) NOT NULL,
    "reservaEmpresa" DECIMAL(12,2) NOT NULL,
    "bolsaSocios" DECIMAL(12,2) NOT NULL,
    "estado" "CierreInteresEstado" NOT NULL DEFAULT 'APLICADO',
    "aplicadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CierreInteresMensual_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CierreInteresDetalle" (
    "id" TEXT NOT NULL,
    "cierreId" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "saldoPromedio" DECIMAL(12,2) NOT NULL,
    "participacionPct" DECIMAL(8,4) NOT NULL,
    "montoAsignado" DECIMAL(12,2) NOT NULL,
    "ahorroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreInteresDetalle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CierreInteresMensual_anio_mes_key" ON "CierreInteresMensual"("anio", "mes");
CREATE INDEX IF NOT EXISTS "CierreInteresMensual_aplicadoAt_idx" ON "CierreInteresMensual"("aplicadoAt");
CREATE INDEX IF NOT EXISTS "CierreInteresDetalle_cierreId_idx" ON "CierreInteresDetalle"("cierreId");
CREATE INDEX IF NOT EXISTS "CierreInteresDetalle_socioId_idx" ON "CierreInteresDetalle"("socioId");

DO $$ BEGIN
  ALTER TABLE "CierreInteresDetalle"
    ADD CONSTRAINT "CierreInteresDetalle_cierreId_fkey"
    FOREIGN KEY ("cierreId") REFERENCES "CierreInteresMensual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "CierreInteresDetalle"
    ADD CONSTRAINT "CierreInteresDetalle_socioId_fkey"
    FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
