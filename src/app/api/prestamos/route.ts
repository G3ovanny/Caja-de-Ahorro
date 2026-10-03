import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { registrarMovimiento } from "@/src/lib/finance/registrarMovimiento";
import { prisma } from "@/src/lib/prisma";
import { prestamoPayloadSchema } from "@/src/lib/validators/prestamos";

const prestamoInclude = {
  socio: {
    select: {
      id: true,
      nombre: true,
      numeroDocumento: true,
    },
  },
};

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const prestamos = await prisma.prestamo.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: prestamoInclude,
    });

    return NextResponse.json(prestamos);
  } catch (error) {
    console.error("Error listing prestamos", error);
    return NextResponse.json(
      { message: "No fue posible obtener los prestamos" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const result = prestamoPayloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para registrar prestamo",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const prestamo = await prisma.$transaction(async (tx) => {
      const created = await tx.prestamo.create({
        data: {
          socioId: result.data.socioId,
          monto: result.data.monto,
          saldo: result.data.saldo ?? result.data.monto,
          interes: result.data.interes,
          tasaMora: result.data.tasaMora,
          interesPendiente: 0,
          moraPendiente: 0,
          fechaVencimiento: result.data.fechaVencimiento
            ? new Date(result.data.fechaVencimiento)
            : null,
          ultimoCalculoAt: new Date(),
          estado: result.data.estado,
        },
      });

      const capitalDesembolsado = Number(created.saldo);
      const generaDesembolso =
        capitalDesembolsado > 0 &&
        (created.estado === "ACTIVO" || created.estado === "VENCIDO");

      if (generaDesembolso) {
        await registrarMovimiento(tx, {
          socioId: created.socioId,
          tipo: "DESEMBOLSO_PRESTAMO",
          monto: capitalDesembolsado,
          descripcion: "Desembolso de prestamo",
          referenciaTipo: "PRESTAMO",
          referenciaId: created.id,
        });
      }

      return tx.prestamo.findUniqueOrThrow({
        where: { id: created.id },
        include: prestamoInclude,
      });
    });

    return NextResponse.json(prestamo, { status: 201 });
  } catch (error) {
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

    console.error("Error creating prestamo", error);
    return NextResponse.json(
      { message: "No fue posible registrar el prestamo" },
      { status: 500 },
    );
  }
}
