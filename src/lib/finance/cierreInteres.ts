import type { Prisma, PrismaClient } from "@prisma/client";
import { calcularSaldosAhorroPorSocios } from "@/src/lib/finance/saldoAhorro";
import {
  asignarBolsaProporcional,
  periodoMensualUtc,
  PORCENTAJE_EMPRESA_CIERRE,
  PORCENTAJE_SOCIOS_CIERRE,
  round2,
  type AsignacionSocio,
} from "@/src/lib/finance/cierreInteresMath";

type Tx = Prisma.TransactionClient | PrismaClient;

export type PreviewCierreInteres = {
  anio: number;
  mes: number;
  periodoInicio: string;
  periodoFin: string;
  interesBruto: number;
  porcentajeEmpresa: number;
  porcentajeSocios: number;
  reservaEmpresa: number;
  bolsaSocios: number;
  totalSaldoPromedio: number;
  detalles: Array<
    AsignacionSocio & {
      socio: {
        id: string;
        nombre: string;
        numeroDocumento: string;
      };
    }
  >;
};

export async function calcularPreviewCierreInteres(
  db: Tx,
  anio: number,
  mes: number,
): Promise<PreviewCierreInteres> {
  const { periodoInicio, periodoFin } = periodoMensualUtc(anio, mes);

  const [interesAgg, socios] = await Promise.all([
    db.prestamoPago.aggregate({
      where: {
        fechaPago: {
          gte: periodoInicio,
          lte: periodoFin,
        },
      },
      _sum: { interesPagado: true },
    }),
    db.socio.findMany({
      where: { estado: "ACTIVO" },
      select: {
        id: true,
        nombre: true,
        numeroDocumento: true,
      },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const interesBruto = round2(Number(interesAgg._sum.interesPagado ?? 0));
  const reservaEmpresa = round2((interesBruto * PORCENTAJE_EMPRESA_CIERRE) / 100);
  const bolsaSocios = round2(interesBruto - reservaEmpresa);

  const saldos = await calcularSaldosAhorroPorSocios(
    db,
    socios.map((socio) => socio.id),
    periodoFin,
  );

  const pesos = socios.map((socio) => ({
    socioId: socio.id,
    saldoPromedio: round2(saldos.get(socio.id)?.saldoDisponible ?? 0),
  }));

  const asignaciones = asignarBolsaProporcional(bolsaSocios, pesos);
  const socioById = new Map(socios.map((socio) => [socio.id, socio]));

  const detalles = asignaciones
    .map((item) => {
      const socio = socioById.get(item.socioId);
      if (!socio) return null;
      return {
        ...item,
        socio: {
          id: socio.id,
          nombre: socio.nombre,
          numeroDocumento: socio.numeroDocumento,
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.montoAsignado - a.montoAsignado || a.socio.nombre.localeCompare(b.socio.nombre));

  const totalSaldoPromedio = round2(
    pesos.reduce((sum, item) => sum + item.saldoPromedio, 0),
  );

  return {
    anio,
    mes,
    periodoInicio: periodoInicio.toISOString(),
    periodoFin: periodoFin.toISOString(),
    interesBruto,
    porcentajeEmpresa: PORCENTAJE_EMPRESA_CIERRE,
    porcentajeSocios: PORCENTAJE_SOCIOS_CIERRE,
    reservaEmpresa,
    bolsaSocios,
    totalSaldoPromedio,
    detalles,
  };
}
