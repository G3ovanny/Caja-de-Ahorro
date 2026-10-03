import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { prisma } from "@/src/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function decimalToString(value: { toString(): string }): string {
  return value.toString();
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;

    const cierre = await prisma.cierreInteresMensual.findUnique({
      where: { id },
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

    if (!cierre) {
      return NextResponse.json(
        { message: "No existe un cierre con ese identificador" },
        { status: 404 },
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error getting cierre interes", error);
    return NextResponse.json(
      { message: "No fue posible obtener el cierre de interes" },
      { status: 500 },
    );
  }
}
