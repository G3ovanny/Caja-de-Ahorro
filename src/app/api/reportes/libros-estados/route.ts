import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { buildLibrosEstadosCuentaZip } from "@/src/lib/export/librosEstadosCuentaExcel";
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

    const { buffer, filename } = await buildLibrosEstadosCuentaZip(parsed.data);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
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
        : "No fue posible generar los libros de estados de cuenta";

    if (status === 404) {
      return NextResponse.json({ message }, { status: 404 });
    }

    console.error("Error generando libros de estados", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
