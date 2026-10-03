-- Idempotent: columnas pueden existir si una ejecucion anterior fallo a mitad.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Movimiento'
      AND column_name = 'descripcion'
  ) THEN
    ALTER TABLE "Movimiento" ADD COLUMN "descripcion" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Movimiento'
      AND column_name = 'referenciaTipo'
  ) THEN
    ALTER TABLE "Movimiento" ADD COLUMN "referenciaTipo" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Movimiento'
      AND column_name = 'referenciaId'
  ) THEN
    ALTER TABLE "Movimiento" ADD COLUMN "referenciaId" TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Movimiento_referenciaTipo_referenciaId_idx"
  ON "Movimiento"("referenciaTipo", "referenciaId");
