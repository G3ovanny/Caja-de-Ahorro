import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { registrarMovimiento } from "@/src/lib/finance/registrarMovimiento";
import { prisma } from "@/src/lib/prisma";
import { createRetiroSchema } from "@/src/lib/validators/retiros";

const movimientoInclude = {
  socio: {
    select: {
      id: true,
      nombre: true,
      numeroDocumento: true,
    },
  },
} as const;

const AMOUNT_EPS = 0.005;

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const retiros = await prisma.movimiento.findMany({
      where: {
        tipo: "RETIRO",
        referenciaTipo: "RETIRO",
      },
      orderBy: { createdAt: "desc" },
      include: movimientoInclude,
    });

    return NextResponse.json(retiros);
  } catch (error) {
    console.error("Error listing retiros", error);
    return NextResponse.json(
      { message: "No fue posible obtener los retiros" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const result = createRetiroSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para registrar retiro",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const retiro = await prisma.$transaction(async (tx) => {
      const socio = await tx.socio.findUnique({
        where: { id: result.data.socioId },
        select: { id: true },
      });

      if (!socio) {
        return { error: { status: 400, message: "No existe el socio seleccionado para el retiro" } };
      }

      const aportesAgg = await tx.ahorro.aggregate({
        where: { socioId: result.data.socioId },
        _sum: { monto: true },
      });

      const retirosAgg = await tx.movimiento.aggregate({
        where: {
          socioId: result.data.socioId,
          tipo: "RETIRO",
          referenciaTipo: "RETIRO",
        },
        _sum: { monto: true },
      });

      const aportes = Number(aportesAgg._sum.monto ?? 0);
      const retiros = Number(retirosAgg._sum.monto ?? 0);
      const disponible = Math.max(0, aportes - retiros);
      const montoRetiro = Number(result.data.monto);

      if (montoRetiro > disponible + AMOUNT_EPS) {
        return {
          error: {
            status: 400,
            message: `El retiro supera el disponible para ahorro (${disponible.toFixed(2)})`,
          },
        };
      }

      const movimiento = await registrarMovimiento(tx, {
        socioId: result.data.socioId,
        tipo: "RETIRO",
        monto: montoRetiro,
        descripcion: result.data.descripcion?.trim() || "Retiro de ahorro",
        referenciaTipo: "RETIRO",
        referenciaId: crypto.randomUUID(),
      });

      if (result.data.fecha) {
        await tx.movimiento.update({
          where: { id: movimiento.id },
          data: { createdAt: new Date(result.data.fecha) },
        });
      }

      const complete = await tx.movimiento.findUniqueOrThrow({
        where: { id: movimiento.id },
        include: movimientoInclude,
      });

      return { payload: complete };
    });

    if ("error" in retiro && retiro.error) {
      return NextResponse.json({ message: retiro.error.message }, { status: retiro.error.status });
    }

    return NextResponse.json(retiro.payload, { status: 201 });
  } catch (error) {
    console.error("Error creating retiro", error);
    return NextResponse.json(
      { message: "No fue posible registrar el retiro" },
      { status: 500 },
    );
  }
}
