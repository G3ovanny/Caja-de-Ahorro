-- Create enums for controlled financial states
CREATE TYPE "PrestamoEstado" AS ENUM (
  'SOLICITADO',
  'APROBADO',
  'ACTIVO',
  'VENCIDO',
  'CANCELADO',
  'RECHAZADO'
);

CREATE TYPE "MovimientoTipo" AS ENUM (
  'APORTE',
  'RETIRO',
  'DESEMBOLSO_PRESTAMO',
  'PAGO_PRESTAMO',
  'AJUSTE'
);

-- Add audit columns
ALTER TABLE "Socio"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Ahorro"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Prestamo"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Movimiento"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert free-text columns to enums
ALTER TABLE "Prestamo"
ALTER COLUMN "estado" TYPE "PrestamoEstado"
USING (
  CASE UPPER("estado")
    WHEN 'SOLICITADO' THEN 'SOLICITADO'::"PrestamoEstado"
    WHEN 'APROBADO' THEN 'APROBADO'::"PrestamoEstado"
    WHEN 'ACTIVO' THEN 'ACTIVO'::"PrestamoEstado"
    WHEN 'VENCIDO' THEN 'VENCIDO'::"PrestamoEstado"
    WHEN 'CANCELADO' THEN 'CANCELADO'::"PrestamoEstado"
    WHEN 'RECHAZADO' THEN 'RECHAZADO'::"PrestamoEstado"
    WHEN 'PAGADO' THEN 'CANCELADO'::"PrestamoEstado"
    ELSE 'ACTIVO'::"PrestamoEstado"
  END
);

ALTER TABLE "Prestamo"
ALTER COLUMN "estado" SET DEFAULT 'SOLICITADO';

ALTER TABLE "Movimiento"
ALTER COLUMN "tipo" TYPE "MovimientoTipo"
USING (
  CASE UPPER("tipo")
    WHEN 'APORTE' THEN 'APORTE'::"MovimientoTipo"
    WHEN 'RETIRO' THEN 'RETIRO'::"MovimientoTipo"
    WHEN 'DESEMBOLSO_PRESTAMO' THEN 'DESEMBOLSO_PRESTAMO'::"MovimientoTipo"
    WHEN 'PAGO_PRESTAMO' THEN 'PAGO_PRESTAMO'::"MovimientoTipo"
    WHEN 'AJUSTE' THEN 'AJUSTE'::"MovimientoTipo"
    ELSE 'AJUSTE'::"MovimientoTipo"
  END
);

-- Add operational indexes
CREATE INDEX "Socio_activo_idx" ON "Socio"("activo");
CREATE INDEX "Socio_createdAt_idx" ON "Socio"("createdAt");
CREATE INDEX "Ahorro_socioId_fecha_idx" ON "Ahorro"("socioId", "fecha");
CREATE INDEX "Prestamo_socioId_estado_idx" ON "Prestamo"("socioId", "estado");
CREATE INDEX "Prestamo_createdAt_idx" ON "Prestamo"("createdAt");
CREATE INDEX "Movimiento_socioId_createdAt_idx" ON "Movimiento"("socioId", "createdAt");
CREATE INDEX "Movimiento_tipo_createdAt_idx" ON "Movimiento"("tipo", "createdAt");

-- Financial data integrity checks
ALTER TABLE "Ahorro"
ADD CONSTRAINT "Ahorro_monto_positivo_chk" CHECK ("monto" > 0);

ALTER TABLE "Prestamo"
ADD CONSTRAINT "Prestamo_monto_positivo_chk" CHECK ("monto" > 0),
ADD CONSTRAINT "Prestamo_saldo_no_negativo_chk" CHECK ("saldo" >= 0),
ADD CONSTRAINT "Prestamo_interes_rango_chk" CHECK ("interes" >= 0 AND "interes" <= 100);

ALTER TABLE "Movimiento"
ADD CONSTRAINT "Movimiento_monto_positivo_chk" CHECK ("monto" > 0);
