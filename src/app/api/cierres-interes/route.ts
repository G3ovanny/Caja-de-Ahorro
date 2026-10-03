import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { aplicarCierreInteresMensual } from "@/src/lib/finance/aplicarCierreInteres";
import { prisma } from "@/src/lib/prisma";
import { cierreInteresPeriodoSchema } from "@/src/lib/validators/cierresInteres";

function decimalToString(value: { toString(): string } | number): string {
  return typeof value === "number" ? value.toFixed(2) : value.toString();
}

export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const cierres = await prisma.cierreInteresMensual.findMany({
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
      include: {
        _count: { select: { detalles: true } },
      },
    });

    return NextResponse.json(
      cierres.map((cierre) => ({
        id: cierre.id,
        anio: cierre.anio,
        mes: cierre.mes,
        periodoInicio: cierre.periodoInicio.toISOString(),
        periodoFin: cierre.periodoFin.toISOString(),
        interesBruto: decimalToString(cierre.interesBruto),
        porcentajeEmpresa: decimalToString(cierre.porcentajeEmpresa),
        porcentajeSocios: decimalToString(cierre.porcentajeSocios),
        reservaEmpresa: decimalToString(cierre.reservaEmpresa),
        bolsaSocios: decimalToString(cierre.bolsaSocios),
        estado: cierre.estado,
        aplicadoAt: cierre.aplicadoAt.toISOString(),
        createdAt: cierre.createdAt.toISOString(),
        cantidadDetalles: cierre._count.detalles,
      })),
    );
  } catch (error) {
    console.error("Error listing cierres interes", error);
    return NextResponse.json(
      { message: "No fue posible listar los cierres de interes" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const parsed = cierreInteresPeriodoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Periodo invalido para el cierre",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const cierre = await aplicarCierreInteresMensual(
      prisma,
      parsed.data.anio,
      parsed.data.mes,
    );

    return NextResponse.json(
      {
        id: cierre.id,
        anio: cierre.anio,
        mes: cierre.mes,
        periodoInicio: cierre.periodoInicio.toISOString(),
        periodoFin: cierre.periodoFin.toISOString(),
        interesBruto: decimalToString(cierre.interesBruto),
        porcentajeEmpresa: decimalToString(cierre.porcentajeEmpresa),
        porcentajeSocios: decimalToString(cierre.porcentajeSocios),
        reservaEmpresa: decimalToString(cierre.reservaEmpresa),
        bolsaSocios: decimalToString(cierre.bolsaSocios),
        estado: cierre.estado,
        aplicadoAt: cierre.aplicadoAt.toISOString(),
        createdAt: cierre.createdAt.toISOString(),
        detalles: cierre.detalles.map((detalle) => ({
          id: detalle.id,
          socioId: detalle.socioId,
          saldoPromedio: decimalToString(detalle.saldoPromedio),
          participacionPct: decimalToString(detalle.participacionPct),
          montoAsignado: decimalToString(detalle.montoAsignado),
          ahorroId: detalle.ahorroId,
          socio: detalle.socio,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible aplicar el cierre de interes";

    if (status >= 400 && status < 500) {
      return NextResponse.json({ message }, { status });
    }

    console.error("Error applying cierre interes", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
