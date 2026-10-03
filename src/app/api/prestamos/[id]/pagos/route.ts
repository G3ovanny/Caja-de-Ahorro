import type { PrestamoEstado } from "@prisma/client";
import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { registrarMovimiento } from "@/src/lib/finance/registrarMovimiento";
import { prisma } from "@/src/lib/prisma";
import { pagoPrestamoSchema } from "@/src/lib/validators/prestamos";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateDays(startDate: Date, endDate: Date): number {
  const diff = endDate.getTime() - startDate.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / MS_PER_DAY);
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;

    const pagos = await prisma.prestamoPago.findMany({
      where: { prestamoId: id },
      orderBy: {
        fechaPago: "desc",
      },
    });

    return NextResponse.json(pagos);
  } catch (error) {
    console.error("Error listing prestamo pagos", error);
    return NextResponse.json(
      { message: "No fue posible obtener los pagos del prestamo" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;
    const body = await req.json();
    const result = pagoPrestamoSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para registrar pago",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const fechaPago = result.data.fechaPago ? new Date(result.data.fechaPago) : new Date();

    const transactionResult = await prisma.$transaction(async (tx) => {
      const prestamo = await tx.prestamo.findUnique({
        where: { id },
      });

      if (!prestamo) {
        return { error: { status: 404, message: "No existe un prestamo con ese identificador" } };
      }

      if (prestamo.estado === "CANCELADO") {
        return {
          error: {
            status: 409,
            message: "El prestamo ya esta cancelado y no admite mas pagos",
          },
        };
      }

      if (prestamo.estado === "RECHAZADO") {
        return {
          error: {
            status: 409,
            message: "No se puede registrar pagos en un prestamo rechazado",
          },
        };
      }

      const saldoActual = Number(prestamo.saldo);
      const interesPendienteActual = Number(prestamo.interesPendiente);
      const moraPendienteActual = Number(prestamo.moraPendiente);

      const baseCalculo = prestamo.ultimoCalculoAt ?? prestamo.createdAt;
      const diasInteres = calculateDays(baseCalculo, fechaPago);
      const tasaInteresDiaria = Number(prestamo.interes) / 100 / 30;
      const interesGenerado = round2(saldoActual * tasaInteresDiaria * diasInteres);

      let diasMora = 0;
      if (prestamo.fechaVencimiento) {
        const inicioMora =
          baseCalculo > prestamo.fechaVencimiento ? baseCalculo : prestamo.fechaVencimiento;
        diasMora = calculateDays(inicioMora, fechaPago);
      }

      const tasaMoraDiaria = Number(prestamo.tasaMora) / 100 / 30;
      const moraGenerada = round2(saldoActual * tasaMoraDiaria * diasMora);

      const totalInteresPendiente = round2(interesPendienteActual + interesGenerado);
      const totalMoraPendiente = round2(moraPendienteActual + moraGenerada);

      const montoPago = round2(result.data.monto);
      const deudaTotal = round2(saldoActual + totalInteresPendiente + totalMoraPendiente);

      if (deudaTotal <= 0.005) {
        return {
          error: {
            status: 400,
            message: "No hay deuda pendiente en este prestamo (capital, interes ni mora)",
          },
        };
      }

      if (montoPago > deudaTotal + 0.009) {
        return {
          error: {
            status: 400,
            message: `El abono no puede superar la deuda total pendiente (${deudaTotal.toFixed(2)})`,
          },
        };
      }

      let restante = montoPago;
      const moraPagada = round2(Math.min(restante, totalMoraPendiente));
      restante = round2(restante - moraPagada);

      const interesPagado = round2(Math.min(restante, totalInteresPendiente));
      restante = round2(restante - interesPagado);

      const capitalPagado = round2(Math.min(restante, saldoActual));

      const nuevoSaldo = round2(saldoActual - capitalPagado);
      const nuevoInteresPendiente = round2(totalInteresPendiente - interesPagado);
      const nuevaMoraPendiente = round2(totalMoraPendiente - moraPagada);

      let nuevoEstado: PrestamoEstado = prestamo.estado;
      if (nuevoSaldo <= 0 && nuevoInteresPendiente <= 0 && nuevaMoraPendiente <= 0) {
        nuevoEstado = "CANCELADO";
      } else if (prestamo.fechaVencimiento && fechaPago > prestamo.fechaVencimiento) {
        nuevoEstado = "VENCIDO";
      } else if (prestamo.estado === "SOLICITADO" || prestamo.estado === "APROBADO") {
        nuevoEstado = "ACTIVO";
      }

      const updatedPrestamo = await tx.prestamo.update({
        where: { id: prestamo.id },
        data: {
          saldo: nuevoSaldo,
          interesPendiente: nuevoInteresPendiente,
          moraPendiente: nuevaMoraPendiente,
          ultimoCalculoAt: fechaPago,
          estado: nuevoEstado,
        },
        include: {
          socio: {
            select: {
              id: true,
              nombre: true,
              numeroDocumento: true,
            },
          },
        },
      });

      const pago = await tx.prestamoPago.create({
        data: {
          prestamoId: prestamo.id,
          monto: montoPago,
          interesPagado,
          moraPagada,
          capitalPagado,
          saldoAnterior: saldoActual,
          saldoNuevo: nuevoSaldo,
          interesGenerado,
          moraGenerada,
          interesPendiente: nuevoInteresPendiente,
          moraPendiente: nuevaMoraPendiente,
          fechaPago,
        },
      });

      await registrarMovimiento(tx, {
        socioId: prestamo.socioId,
        tipo: "PAGO_PRESTAMO",
        monto: montoPago,
        descripcion: "Abono a prestamo",
        referenciaTipo: "PAGO_PRESTAMO",
        referenciaId: pago.id,
      });

      return {
        payload: {
          prestamo: updatedPrestamo,
          pago,
        },
      };
    });

    if ("error" in transactionResult && transactionResult.error) {
      const { message, status } = transactionResult.error;
      return NextResponse.json({ message }, { status });
    }

    if (
      !transactionResult ||
      typeof transactionResult !== "object" ||
      !("payload" in transactionResult) ||
      !transactionResult.payload ||
      typeof transactionResult.payload !== "object"
    ) {
      console.error("Respuesta inesperada de transaccion de pago", transactionResult);
      return NextResponse.json(
        { message: "Error interno al finalizar el registro del pago" },
        { status: 500 },
      );
    }

    return NextResponse.json(transactionResult.payload, { status: 201 });
  } catch (error) {
    console.error("Error creating prestamo payment", error);
    return NextResponse.json(
      { message: "No fue posible registrar el pago del prestamo" },
      { status: 500 },
    );
  }
}
