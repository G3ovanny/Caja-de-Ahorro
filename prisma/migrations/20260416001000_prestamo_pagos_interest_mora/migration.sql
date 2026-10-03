-- AlterTable
ALTER TABLE "Prestamo"
ADD COLUMN "tasaMora" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "interesPendiente" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "moraPendiente" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "fechaVencimiento" TIMESTAMP(3),
ADD COLUMN "ultimoCalculoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PrestamoPago" (
    "id" TEXT NOT NULL,
    "prestamoId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "interesPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "moraPagada" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "capitalPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoAnterior" DECIMAL(12,2) NOT NULL,
    "saldoNuevo" DECIMAL(12,2) NOT NULL,
    "interesGenerado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "moraGenerada" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "interesPendiente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "moraPendiente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrestamoPago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prestamo_fechaVencimiento_idx" ON "Prestamo"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "PrestamoPago_prestamoId_fechaPago_idx" ON "PrestamoPago"("prestamoId", "fechaPago");

-- CreateIndex
CREATE INDEX "PrestamoPago_createdAt_idx" ON "PrestamoPago"("createdAt");

-- AddForeignKey
ALTER TABLE "PrestamoPago" ADD CONSTRAINT "PrestamoPago_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "Prestamo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Financial integrity checks
ALTER TABLE "Prestamo"
ADD CONSTRAINT "Prestamo_tasaMora_rango_chk" CHECK ("tasaMora" >= 0 AND "tasaMora" <= 100),
ADD CONSTRAINT "Prestamo_interesPendiente_no_negativo_chk" CHECK ("interesPendiente" >= 0),
ADD CONSTRAINT "Prestamo_moraPendiente_no_negativo_chk" CHECK ("moraPendiente" >= 0);

ALTER TABLE "PrestamoPago"
ADD CONSTRAINT "PrestamoPago_monto_positivo_chk" CHECK ("monto" > 0),
ADD CONSTRAINT "PrestamoPago_componentes_no_negativos_chk" CHECK (
  "interesPagado" >= 0 AND
  "moraPagada" >= 0 AND
  "capitalPagado" >= 0 AND
  "interesGenerado" >= 0 AND
  "moraGenerada" >= 0 AND
  "interesPendiente" >= 0 AND
  "moraPendiente" >= 0
);
