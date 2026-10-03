import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export type SaldoAhorro = {
  totalAportado: number;
  totalRetirado: number;
  saldoDisponible: number;
};

export async function calcularSaldoAhorro(
  db: Tx,
  socioId: string,
  asOf?: Date,
): Promise<SaldoAhorro> {
  const map = await calcularSaldosAhorroPorSocios(db, [socioId], asOf);
  return map.get(socioId) ?? {
    totalAportado: 0,
    totalRetirado: 0,
    saldoDisponible: 0,
  };
}

export async function calcularSaldosAhorroPorSocios(
  db: Tx,
  socioIds: string[],
  asOf?: Date,
): Promise<Map<string, SaldoAhorro>> {
  const result = new Map<string, SaldoAhorro>();

  for (const socioId of socioIds) {
    result.set(socioId, {
      totalAportado: 0,
      totalRetirado: 0,
      saldoDisponible: 0,
    });
  }

  if (socioIds.length === 0) {
    return result;
  }

  const [aportesAgg, retirosAgg] = await Promise.all([
    db.ahorro.groupBy({
      by: ["socioId"],
      where: {
        socioId: { in: socioIds },
        ...(asOf ? { fecha: { lte: asOf } } : {}),
      },
      _sum: { monto: true },
    }),
    db.movimiento.groupBy({
      by: ["socioId"],
      where: {
        socioId: { in: socioIds },
        tipo: "RETIRO",
        referenciaTipo: "RETIRO",
        ...(asOf ? { createdAt: { lte: asOf } } : {}),
      },
      _sum: { monto: true },
    }),
  ]);

  for (const row of aportesAgg) {
    const current = result.get(row.socioId);
    if (current) {
      current.totalAportado = Number(row._sum.monto ?? 0);
    }
  }

  for (const row of retirosAgg) {
    const current = result.get(row.socioId);
    if (current) {
      current.totalRetirado = Number(row._sum.monto ?? 0);
    }
  }

  for (const saldo of result.values()) {
    saldo.saldoDisponible = Math.max(0, saldo.totalAportado - saldo.totalRetirado);
  }

  return result;
}
