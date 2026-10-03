import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { calcularPreviewCierreInteres } from "@/src/lib/finance/cierreInteres";
import { prisma } from "@/src/lib/prisma";
import { cierreInteresPeriodoSchema } from "@/src/lib/validators/cierresInteres";

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const parsed = cierreInteresPeriodoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Periodo invalido para previsualizar el cierre",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const existente = await prisma.cierreInteresMensual.findUnique({
      where: {
        anio_mes: { anio: parsed.data.anio, mes: parsed.data.mes },
      },
    });

    const preview = await calcularPreviewCierreInteres(
      prisma,
      parsed.data.anio,
      parsed.data.mes,
    );

    return NextResponse.json({
      anio: preview.anio,
      mes: preview.mes,
      periodoInicio: preview.periodoInicio,
      periodoFin: preview.periodoFin,
      interesBruto: preview.interesBruto.toFixed(2),
      porcentajeEmpresa: preview.porcentajeEmpresa,
      porcentajeSocios: preview.porcentajeSocios,
      reservaEmpresa: preview.reservaEmpresa.toFixed(2),
      bolsaSocios: preview.bolsaSocios.toFixed(2),
      totalSaldoPromedio: preview.totalSaldoPromedio.toFixed(2),
      yaAplicado: Boolean(existente),
      cierreId: existente?.id ?? null,
      detalles: preview.detalles.map((detalle) => ({
        socioId: detalle.socioId,
        saldoPromedio: detalle.saldoPromedio.toFixed(2),
        participacionPct: detalle.participacionPct.toFixed(4),
        montoAsignado: detalle.montoAsignado.toFixed(2),
        socio: detalle.socio,
      })),
    });
  } catch (error) {
    console.error("Error previewing cierre interes", error);
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible previsualizar el cierre de interes";
    return NextResponse.json({ message }, { status: 500 });
  }
}
