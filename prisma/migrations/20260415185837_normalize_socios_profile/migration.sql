DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Ahorro' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Ahorro" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Movimiento' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Movimiento" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Prestamo' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Prestamo" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Socio' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Socio" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
