import { calcularSaldosAhorroPorSocios } from "@/src/lib/finance/saldoAhorro";
import { prisma } from "@/src/lib/prisma";
import type { EstadosCuentaReporte } from "@/src/lib/api/estados-cuenta";

function decimalToString(value: { toString(): string } | number | null | undefined): string {
  if (value == null) return "0.00";
  return Number(value).toFixed(2);
}

const socioSelect = {
  id: true,
  nombre: true,
  tipoDocumento: true,
  numeroDocumento: true,
  telefono: true,
  email: true,
  direccion: true,
  estado: true,
} as const;

export async function generarEstadosCuentaReporte(params: {
  socioId?: string;
  desde?: Date;
  hasta?: Date;
}): Promise<EstadosCuentaReporte> {
  const { socioId, desde, hasta } = params;
  const asOf = hasta ?? undefined;

  const socios = await prisma.socio.findMany({
    where: socioId ? { id: socioId } : undefined,
    select: socioSelect,
    orderBy: { nombre: "asc" },
  });

  if (socioId && socios.length === 0) {
    throw Object.assign(new Error("Socio no encontrado"), { status: 404 });
  }

  const socioIds = socios.map((socio) => socio.id);

  const asOfAntesDelPeriodo = desde ? new Date(desde.getTime() - 1) : undefined;

  const [saldosPorSocio, saldosInicialesPeriodo, prestamos, movimientos] =
    await Promise.all([
    calcularSaldosAhorroPorSocios(prisma, socioIds, asOf),
    asOfAntesDelPeriodo
      ? calcularSaldosAhorroPorSocios(prisma, socioIds, asOfAntesDelPeriodo)
      : Promise.resolve(new Map<string, { saldoDisponible: number }>()),
    prisma.prestamo.findMany({
      where: {
        socioId: { in: socioIds },
        ...(asOf ? { createdAt: { lte: asOf } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        socioId: true,
        monto: true,
        saldo: true,
        interes: true,
        tasaMora: true,
        interesPendiente: true,
        moraPendiente: true,
        fechaVencimiento: true,
        ultimoCalculoAt: true,
        estado: true,
        createdAt: true,
        pagos: {
          where: {
            ...(desde || hasta
              ? {
                  fechaPago: {
                    ...(desde ? { gte: desde } : {}),
                    ...(hasta ? { lte: hasta } : {}),
                  },
                }
              : {}),
          },
          orderBy: { fechaPago: "asc" },
          select: {
            id: true,
            monto: true,
            capitalPagado: true,
            interesPagado: true,
            moraPagada: true,
            saldoAnterior: true,
            saldoNuevo: true,
            fechaPago: true,
          },
        },
      },
    }),
    prisma.movimiento.findMany({
      where: {
        socioId: { in: socioIds },
        ...(desde || hasta
          ? {
              createdAt: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        socioId: true,
        tipo: true,
        monto: true,
        descripcion: true,
        referenciaTipo: true,
        referenciaId: true,
        createdAt: true,
      },
    }),
  ]);

  const prestamosPorSocio = new Map<string, typeof prestamos>();
  for (const prestamo of prestamos) {
    const list = prestamosPorSocio.get(prestamo.socioId) ?? [];
    list.push(prestamo);
    prestamosPorSocio.set(prestamo.socioId, list);
  }

  const movimientosPorSocio = new Map<string, typeof movimientos>();
  for (const movimiento of movimientos) {
    const list = movimientosPorSocio.get(movimiento.socioId) ?? [];
    list.push(movimiento);
    movimientosPorSocio.set(movimiento.socioId, list);
  }

  const estados = socios.map((socio) => {
    const resumenAhorros = saldosPorSocio.get(socio.id) ?? {
      totalAportado: 0,
      totalRetirado: 0,
      saldoDisponible: 0,
    };
    const saldoInicialPeriodo =
      saldosInicialesPeriodo.get(socio.id)?.saldoDisponible ?? 0;

    const prestamosDetalle = (prestamosPorSocio.get(socio.id) ?? []).map((prestamo) => {
      const capital = Number(prestamo.saldo);
      const interesPendiente = Number(prestamo.interesPendiente);
      const moraPendiente = Number(prestamo.moraPendiente);
      const deudaTotal = capital + interesPendiente + moraPendiente;

      return {
        id: prestamo.id,
        monto: decimalToString(prestamo.monto),
        saldo: decimalToString(prestamo.saldo),
        interes: decimalToString(prestamo.interes),
        tasaMora: decimalToString(prestamo.tasaMora),
        interesPendiente: decimalToString(prestamo.interesPendiente),
        moraPendiente: decimalToString(prestamo.moraPendiente),
        deudaTotal: deudaTotal.toFixed(2),
        fechaVencimiento: prestamo.fechaVencimiento?.toISOString() ?? null,
        ultimoCalculoAt: prestamo.ultimoCalculoAt?.toISOString() ?? null,
        estado: prestamo.estado,
        createdAt: prestamo.createdAt.toISOString(),
        pagos: prestamo.pagos.map((pago) => ({
          id: pago.id,
          monto: decimalToString(pago.monto),
          capitalPagado: decimalToString(pago.capitalPagado),
          interesPagado: decimalToString(pago.interesPagado),
          moraPagada: decimalToString(pago.moraPagada),
          saldoAnterior: decimalToString(pago.saldoAnterior),
          saldoNuevo: decimalToString(pago.saldoNuevo),
          fechaPago: pago.fechaPago.toISOString(),
        })),
      };
    });

    const prestamosActivos = prestamosDetalle.filter(
      (p) => p.estado === "ACTIVO" || p.estado === "VENCIDO",
    );

    const totalCapitalPendiente = prestamosActivos.reduce(
      (sum, p) => sum + Number(p.saldo),
      0,
    );
    const totalDeudaEstimada = prestamosActivos.reduce(
      (sum, p) => sum + Number(p.deudaTotal),
      0,
    );

    return {
      socio,
      resumenAhorros: {
        totalAportado: resumenAhorros.totalAportado.toFixed(2),
        totalRetirado: resumenAhorros.totalRetirado.toFixed(2),
        saldoDisponible: resumenAhorros.saldoDisponible.toFixed(2),
        saldoInicialPeriodo: saldoInicialPeriodo.toFixed(2),
      },
      resumenPrestamos: {
        totalCapitalPendiente: totalCapitalPendiente.toFixed(2),
        totalDeudaEstimada: totalDeudaEstimada.toFixed(2),
        cantidadActivos: prestamosActivos.length,
        prestamos: prestamosDetalle,
      },
      movimientos: (movimientosPorSocio.get(socio.id) ?? []).map((movimiento) => ({
        id: movimiento.id,
        tipo: movimiento.tipo,
        monto: decimalToString(movimiento.monto),
        descripcion: movimiento.descripcion,
        referenciaTipo: movimiento.referenciaTipo,
        referenciaId: movimiento.referenciaId,
        createdAt: movimiento.createdAt.toISOString(),
      })),
    };
  });

  const totales = estados.reduce(
    (acc, estado) => {
      acc.totalAportado += Number(estado.resumenAhorros.totalAportado);
      acc.totalRetirado += Number(estado.resumenAhorros.totalRetirado);
      acc.saldoDisponible += Number(estado.resumenAhorros.saldoDisponible);
      acc.totalCapitalPendiente += Number(estado.resumenPrestamos.totalCapitalPendiente);
      acc.totalDeudaEstimada += Number(estado.resumenPrestamos.totalDeudaEstimada);
      acc.cantidadPrestamosActivos += estado.resumenPrestamos.cantidadActivos;
      acc.cantidadMovimientos += estado.movimientos.length;
      return acc;
    },
    {
      totalAportado: 0,
      totalRetirado: 0,
      saldoDisponible: 0,
      totalCapitalPendiente: 0,
      totalDeudaEstimada: 0,
      cantidadPrestamosActivos: 0,
      cantidadMovimientos: 0,
    },
  );

  return {
    ambito: socioId ? "SOCIO" : "TODOS",
    periodo: {
      desde: desde?.toISOString() ?? null,
      hasta: hasta?.toISOString() ?? null,
    },
    generadoEn: new Date().toISOString(),
    cantidadSocios: estados.length,
    totales: {
      totalAportado: totales.totalAportado.toFixed(2),
      totalRetirado: totales.totalRetirado.toFixed(2),
      saldoDisponible: totales.saldoDisponible.toFixed(2),
      totalCapitalPendiente: totales.totalCapitalPendiente.toFixed(2),
      totalDeudaEstimada: totales.totalDeudaEstimada.toFixed(2),
      cantidadPrestamosActivos: totales.cantidadPrestamosActivos,
      cantidadMovimientos: totales.cantidadMovimientos,
    },
    estados,
  };
}
