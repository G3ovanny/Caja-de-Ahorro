import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { buildMatrizAhorrosMensualExcel } from "@/src/lib/export/estadosCuentaExcel";
import { estadoCuentaQuerySchema } from "@/src/lib/validators/estados-cuenta";

export async function GET(req: Request) {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const { searchParams } = new URL(req.url);
    const parsed = estadoCuentaQuerySchema.safeParse({
      socioId: searchParams.get("socioId") || undefined,
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

    const { buffer, filename } = await buildMatrizAhorrosMensualExcel(parsed.data);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
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
        : "No fue posible generar el Excel de ahorros mensualizados";

    if (status === 404) {
      return NextResponse.json({ message }, { status: 404 });
    }

    console.error("Error generando matriz de ahorros", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
