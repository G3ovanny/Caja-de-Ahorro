import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { registrarMovimiento } from "@/src/lib/finance/registrarMovimiento";
import { prisma } from "@/src/lib/prisma";
import { prestamoPayloadSchema } from "@/src/lib/validators/prestamos";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const prestamoInclude = {
  socio: {
    select: {
      id: true,
      nombre: true,
      numeroDocumento: true,
    },
  },
};

export async function PUT(req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;
    const body = await req.json();
    const result = prestamoPayloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para actualizar prestamo",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const prestamo = await prisma.$transaction(async (tx) => {
      const previo = await tx.prestamo.findUnique({ where: { id } });

      if (!previo) {
        return null;
      }

      const payload = result.data;

      const data: Prisma.PrestamoUncheckedUpdateInput = {
        socioId: payload.socioId,
        monto: payload.monto,
        interes: payload.interes,
        tasaMora: payload.tasaMora,
        fechaVencimiento: payload.fechaVencimiento
          ? new Date(payload.fechaVencimiento)
          : null,
        estado: payload.estado,
      };

      if (payload.saldo !== undefined) {
        data.saldo = payload.saldo;
      }

      const actualizado = await tx.prestamo.update({
        where: { id },
        data,
        include: prestamoInclude,
      });

      const debeRegistrarDesembolso =
        (actualizado.estado === "ACTIVO" || actualizado.estado === "VENCIDO") &&
        Number(actualizado.saldo) > 0;

      if (debeRegistrarDesembolso) {
        const yaExiste = await tx.movimiento.findFirst({
          where: {
            tipo: "DESEMBOLSO_PRESTAMO",
            referenciaTipo: "PRESTAMO",
            referenciaId: actualizado.id,
          },
        });

        if (!yaExiste) {
          await registrarMovimiento(tx, {
            socioId: actualizado.socioId,
            tipo: "DESEMBOLSO_PRESTAMO",
            monto: Number(actualizado.saldo),
            descripcion: "Desembolso de prestamo",
            referenciaTipo: "PRESTAMO",
            referenciaId: actualizado.id,
          });
        }
      }

      return actualizado;
    });

    if (!prestamo) {
      return NextResponse.json(
        { message: "No existe un prestamo con ese identificador" },
        { status: 404 },
      );
    }

    return NextResponse.json(prestamo);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "No existe un prestamo con ese identificador" },
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
        { message: "No existe el socio seleccionado para el prestamo" },
        { status: 400 },
      );
    }

    console.error("Error updating prestamo", error);
    return NextResponse.json(
      { message: "No fue posible actualizar el prestamo" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;

    const existente = await prisma.prestamo.findUnique({
      where: { id },
      include: {
        _count: {
          select: { pagos: true },
        },
      },
    });

    if (!existente) {
      return NextResponse.json(
        { message: "No existe un prestamo con ese identificador" },
        { status: 404 },
      );
    }

    if (existente._count.pagos > 0) {
      return NextResponse.json(
        {
          message:
            "No se puede eliminar un prestamo con pagos registrados; el historial debe conservarse",
        },
        { status: 409 },
      );
    }

    if (existente.estado === "ACTIVO" || existente.estado === "VENCIDO") {
      return NextResponse.json(
        {
          message:
            "No se puede eliminar un prestamo en curso; cancele o liquide el prestamo antes",
        },
        { status: 409 },
      );
    }

    await prisma.prestamo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "No existe un prestamo con ese identificador" },
        { status: 404 },
      );
    }

    console.error("Error deleting prestamo", error);
    return NextResponse.json(
      { message: "No fue posible eliminar el prestamo" },
      { status: 500 },
    );
  }
}
