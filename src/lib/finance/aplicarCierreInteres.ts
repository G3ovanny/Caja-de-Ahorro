import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { calcularPreviewCierreInteres } from "@/src/lib/finance/cierreInteres";
import { periodoMensualUtc } from "@/src/lib/finance/cierreInteresMath";
import { registrarMovimiento } from "@/src/lib/finance/registrarMovimiento";

export async function aplicarCierreInteresMensual(
  prisma: PrismaClient,
  anio: number,
  mes: number,
) {
  const existente = await prisma.cierreInteresMensual.findUnique({
    where: { anio_mes: { anio, mes } },
  });

  if (existente) {
    throw Object.assign(new Error("Ya existe un cierre aplicado para ese mes"), {
      status: 409,
    });
  }

  const preview = await calcularPreviewCierreInteres(prisma, anio, mes);

  if (preview.interesBruto <= 0) {
    throw Object.assign(
      new Error("No hay interes cobrado en el periodo para repartir"),
      { status: 400 },
    );
  }

  if (preview.bolsaSocios > 0 && preview.totalSaldoPromedio <= 0) {
    throw Object.assign(
      new Error(
        "Hay interes para repartir pero ningun socio activo tiene saldo de ahorro",
      ),
      { status: 400 },
    );
  }

  const { periodoInicio, periodoFin } = periodoMensualUtc(anio, mes);
  const cierreId = randomUUID();
  const fechaCapitalizacion = periodoFin;

  const cierre = await prisma.$transaction(async (tx) => {
    await tx.cierreInteresMensual.create({
      data: {
        id: cierreId,
        anio,
        mes,
        periodoInicio,
        periodoFin,
        interesBruto: preview.interesBruto,
        porcentajeEmpresa: preview.porcentajeEmpresa,
        porcentajeSocios: preview.porcentajeSocios,
        reservaEmpresa: preview.reservaEmpresa,
        bolsaSocios: preview.bolsaSocios,
        estado: "APLICADO",
        aplicadoAt: new Date(),
      },
    });

    for (const detalle of preview.detalles) {
      if (detalle.montoAsignado <= 0) {
        await tx.cierreInteresDetalle.create({
          data: {
            cierreId,
            socioId: detalle.socioId,
            saldoPromedio: detalle.saldoPromedio,
            participacionPct: detalle.participacionPct,
            montoAsignado: 0,
          },
        });
        continue;
      }

      const detalleId = randomUUID();

      const ahorro = await tx.ahorro.create({
        data: {
          socioId: detalle.socioId,
          monto: detalle.montoAsignado,
          fecha: fechaCapitalizacion,
        },
      });

      await tx.cierreInteresDetalle.create({
        data: {
          id: detalleId,
          cierreId,
          socioId: detalle.socioId,
          saldoPromedio: detalle.saldoPromedio,
          participacionPct: detalle.participacionPct,
          montoAsignado: detalle.montoAsignado,
          ahorroId: ahorro.id,
        },
      });

      await registrarMovimiento(tx, {
        socioId: detalle.socioId,
        tipo: "RENDIMIENTO_AHORRO",
        monto: detalle.montoAsignado,
        descripcion: `Rendimiento capitalizado cierre ${String(mes).padStart(2, "0")}/${anio}`,
        referenciaTipo: "CIERRE_INTERES",
        referenciaId: detalleId,
      });
    }

    return tx.cierreInteresMensual.findUniqueOrThrow({
      where: { id: cierreId },
      include: {
        detalles: {
          include: {
            socio: {
              select: {
                id: true,
                nombre: true,
                numeroDocumento: true,
              },
            },
          },
          orderBy: { montoAsignado: "desc" },
        },
      },
    });
  });

  return cierre;
}
