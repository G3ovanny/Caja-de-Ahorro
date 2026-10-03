import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function round2(value) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const now = new Date();
  const anio = now.getUTCFullYear();
  const mes = now.getUTCMonth() + 1;
  const fechaAhorro = new Date(Date.UTC(anio, mes - 1, 5, 12, 0, 0));
  const fechaPrestamo = new Date(Date.UTC(anio, mes - 1, 1, 12, 0, 0));
  const fechaPago = new Date(Date.UTC(anio, mes - 1, Math.min(now.getUTCDate(), 28), 15, 0, 0));

  const socios = await prisma.socio.findMany({
    where: { estado: "ACTIVO" },
    orderBy: { nombre: "asc" },
  });

  if (socios.length === 0) {
    throw new Error("No hay socios activos para generar datos de prueba");
  }

  // Montos distintos para ver porcentajes claros en el cierre
  const montosBase = [500, 800, 1000, 1200, 1500, 2000, 2500, 3000];

  const ahorrosCreados = [];
  for (let i = 0; i < socios.length; i++) {
    const socio = socios[i];
    const monto = montosBase[i % montosBase.length] + i * 50;

    const created = await prisma.$transaction(async (tx) => {
      const ahorro = await tx.ahorro.create({
        data: {
          id: randomUUID(),
          socioId: socio.id,
          monto,
          fecha: fechaAhorro,
        },
      });

      await tx.movimiento.create({
        data: {
          socioId: socio.id,
          tipo: "APORTE",
          monto,
          descripcion: "Aporte de prueba para cierre",
          referenciaTipo: "AHORRO",
          referenciaId: ahorro.id,
          createdAt: fechaAhorro,
        },
      });

      return ahorro;
    });

    ahorrosCreados.push({
      socio: socio.nombre,
      monto: Number(created.monto),
      ahorroId: created.id,
    });
  }

  // Prestamo ACTIVO este mes + pago con interes cobrado (para la bolsa del cierre)
  const socioPrestamo = socios[0];
  const montoPrestamo = 1000;
  const interesPagado = 65; // genera bolsa socios = 65 * 0.65 = 42.25
  const capitalPagado = 100;
  const montoPago = round2(interesPagado + capitalPagado);

  const prestamo = await prisma.$transaction(async (tx) => {
    const created = await tx.prestamo.create({
      data: {
        id: randomUUID(),
        socioId: socioPrestamo.id,
        monto: montoPrestamo,
        saldo: montoPrestamo,
        interes: 5,
        tasaMora: 1,
        interesPendiente: 0,
        moraPendiente: 0,
        fechaVencimiento: new Date(Date.UTC(anio, mes, 1, 12, 0, 0)),
        ultimoCalculoAt: fechaPrestamo,
        estado: "ACTIVO",
        createdAt: fechaPrestamo,
      },
    });

    await tx.movimiento.create({
      data: {
        socioId: socioPrestamo.id,
        tipo: "DESEMBOLSO_PRESTAMO",
        monto: montoPrestamo,
        descripcion: "Desembolso de prestamo de prueba",
        referenciaTipo: "PRESTAMO",
        referenciaId: created.id,
        createdAt: fechaPrestamo,
      },
    });

    const saldoNuevo = round2(montoPrestamo - capitalPagado);
    const pago = await tx.prestamoPago.create({
      data: {
        id: randomUUID(),
        prestamoId: created.id,
        monto: montoPago,
        interesPagado,
        moraPagada: 0,
        capitalPagado,
        saldoAnterior: montoPrestamo,
        saldoNuevo,
        interesGenerado: interesPagado,
        moraGenerada: 0,
        interesPendiente: 0,
        moraPendiente: 0,
        fechaPago,
      },
    });

    await tx.prestamo.update({
      where: { id: created.id },
      data: {
        saldo: saldoNuevo,
        interesPendiente: 0,
        moraPendiente: 0,
        ultimoCalculoAt: fechaPago,
      },
    });

    await tx.movimiento.create({
      data: {
        socioId: socioPrestamo.id,
        tipo: "PAGO_PRESTAMO",
        monto: montoPago,
        descripcion: "Pago de prueba con interes del mes",
        referenciaTipo: "PAGO_PRESTAMO",
        referenciaId: pago.id,
        createdAt: fechaPago,
      },
    });

    return { prestamo: created, pago };
  });

  const totalAhorros = ahorrosCreados.reduce((sum, item) => sum + item.monto, 0);

  console.log(JSON.stringify({
    periodo: { anio, mes },
    socios: socios.length,
    ahorros: ahorrosCreados,
    totalAhorros,
    prestamo: {
      id: prestamo.prestamo.id,
      socio: socioPrestamo.nombre,
      monto: montoPrestamo,
      pagoId: prestamo.pago.id,
      interesPagado,
      capitalPagado,
      fechaPago: fechaPago.toISOString(),
    },
    cierreEsperado: {
      interesBruto: interesPagado,
      reservaEmpresa: round2(interesPagado * 0.35),
      bolsaSocios: round2(interesPagado * 0.65),
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
