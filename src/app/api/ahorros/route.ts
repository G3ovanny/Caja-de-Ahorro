import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { registrarMovimiento } from "@/src/lib/finance/registrarMovimiento";
import { prisma } from "@/src/lib/prisma";
import { createAhorroSchema } from "@/src/lib/validators/ahorros";

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const ahorros = await prisma.ahorro.findMany({
      orderBy: {
        fecha: "desc",
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

    return NextResponse.json(ahorros);
  } catch (error) {
    console.error("Error listing ahorros", error);
    return NextResponse.json(
      { message: "No fue posible obtener los ahorros" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const result = createAhorroSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para registrar ahorro",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const ahorro = await prisma.$transaction(async (tx) => {
      const created = await tx.ahorro.create({
        data: {
          socioId: result.data.socioId,
          monto: result.data.monto,
          fecha: result.data.fecha ? new Date(result.data.fecha) : undefined,
        },
      });

      await registrarMovimiento(tx, {
        socioId: created.socioId,
        tipo: "APORTE",
        monto: Number(created.monto),
        descripcion: "Aporte de ahorro",
        referenciaTipo: "AHORRO",
        referenciaId: created.id,
      });

      return tx.ahorro.findUniqueOrThrow({
        where: { id: created.id },
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

    return NextResponse.json(ahorro, { status: 201 });
  } catch (error) {
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

    console.error("Error creating ahorro", error);
    return NextResponse.json(
      { message: "No fue posible registrar el ahorro" },
      { status: 500 },
    );
  }
}
