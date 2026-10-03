import type { MovimientoReferenciaTipo, MovimientoTipo, Prisma } from "@prisma/client";

export type RegistrarMovimientoInput = {
  socioId: string;
  tipo: MovimientoTipo;
  monto: number;
  descripcion?: string | null;
  referenciaTipo?: MovimientoReferenciaTipo | null;
  referenciaId?: string | null;
};

export function registrarMovimiento(
  tx: Prisma.TransactionClient,
  input: RegistrarMovimientoInput,
) {
  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    throw new Error("El monto del movimiento debe ser un numero mayor que cero");
  }

  return tx.movimiento.create({
    data: {
      socioId: input.socioId,
      tipo: input.tipo,
      monto: input.monto,
      descripcion: input.descripcion ?? null,
      referenciaTipo: input.referenciaTipo ?? null,
      referenciaId: input.referenciaId ?? null,
    },
  });
}
