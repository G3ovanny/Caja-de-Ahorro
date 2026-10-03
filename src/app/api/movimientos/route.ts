import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { prisma } from "@/src/lib/prisma";
import { movimientosQuerySchema } from "@/src/lib/validators/movimientos";

const movimientoInclude = {
  socio: {
    select: {
      id: true,
      nombre: true,
      numeroDocumento: true,
    },
  },
} as const;

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const { searchParams } = new URL(req.url);
    const parsed = movimientosQuerySchema.safeParse({
      socioId: searchParams.get("socioId") ?? undefined,
      tipo: searchParams.get("tipo") ?? undefined,
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Parametros de consulta invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { socioId, tipo, desde, hasta } = parsed.data;

    const movimientos = await prisma.movimiento.findMany({
      where: {
        ...(socioId ? { socioId } : {}),
        ...(tipo ? { tipo } : {}),
        ...(desde || hasta
          ? {
              createdAt: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: movimientoInclude,
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error("Error listing movimientos", error);
    return NextResponse.json(
      { message: "No fue posible obtener el libro de movimientos" },
      { status: 500 },
    );
  }
}
