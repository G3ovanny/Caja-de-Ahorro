import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { registrarMovimiento } from "@/src/lib/finance/registrarMovimiento";
import { prisma } from "@/src/lib/prisma";
import { createAhorroSchema } from "@/src/lib/validators/ahorros";

const AMOUNT_EPS = 0.005;

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;
    const body = await req.json();
    const result = createAhorroSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para actualizar ahorro",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const ahorro = await prisma.$transaction(async (tx) => {
      const anterior = await tx.ahorro.findUnique({ where: { id } });

      if (!anterior) {
        return null;
      }

      const actualizado = await tx.ahorro.update({
        where: { id },
        data: {
          socioId: result.data.socioId,
          monto: result.data.monto,
          fecha: result.data.fecha ? new Date(result.data.fecha) : undefined,
        },
      });

      const montoAnterior = Number(anterior.monto);
      const montoNuevo = Number(actualizado.monto);
      const delta = montoNuevo - montoAnterior;

      if (Math.abs(delta) > AMOUNT_EPS) {
        await registrarMovimiento(tx, {
          socioId: actualizado.socioId,
          tipo: "AJUSTE",
          monto: Math.abs(delta),
          descripcion:
            delta > 0
              ? "Ajuste por incremento del monto de ahorro"
              : "Ajuste por reduccion del monto de ahorro",
          referenciaTipo: "AHORRO",
          referenciaId: actualizado.id,
        });
      }

      return tx.ahorro.findUniqueOrThrow({
        where: { id: actualizado.id },
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
    });

    if (!ahorro) {
      return NextResponse.json(
        { message: "No existe un ahorro con ese identificador" },
        { status: 404 },
      );
    }

    return NextResponse.json(ahorro);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "No existe un ahorro con ese identificador" },
        { status: 404 },
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { message: "No existe el socio seleccionado para el ahorro" },
        { status: 400 },
      );
    }

    console.error("Error updating ahorro", error);
    return NextResponse.json(
      { message: "No fue posible actualizar el ahorro" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;

    const eliminado = await prisma.$transaction(async (tx) => {
      const existente = await tx.ahorro.findUnique({ where: { id } });

      if (!existente) {
        return false;
      }

      await registrarMovimiento(tx, {
        socioId: existente.socioId,
        tipo: "AJUSTE",
        monto: Number(existente.monto),
        descripcion: "Ajuste por eliminacion de registro de aporte",
        referenciaTipo: "AJUSTE",
        referenciaId: existente.id,
      });

      await tx.ahorro.delete({ where: { id } });
      return true;
    });

    if (!eliminado) {
      return NextResponse.json(
        { message: "No existe un ahorro con ese identificador" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "No existe un ahorro con ese identificador" },
        { status: 404 },
      );
    }

    console.error("Error deleting ahorro", error);
    return NextResponse.json(
      { message: "No fue posible eliminar el ahorro" },
      { status: 500 },
    );
  }
}
