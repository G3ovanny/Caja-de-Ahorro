import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { prisma } from "@/src/lib/prisma";
import { createSocioSchema } from "@/src/lib/validators/socios";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;
    const body = await req.json();
    const result = createSocioSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para actualizar socio",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const socio = await prisma.socio.update({
      where: { id },
      data: {
        nombre: result.data.nombre,
        tipoDocumento: result.data.tipoDocumento,
        numeroDocumento: result.data.numeroDocumento,
        telefono: result.data.telefono,
        email: result.data.email?.trim() ? result.data.email.trim() : null,
        direccion: result.data.direccion?.trim() ? result.data.direccion.trim() : null,
        estado: result.data.estado,
      },
    });

    return NextResponse.json(socio);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "No existe un socio con ese identificador" },
        { status: 404 },
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Ya existe un socio con el documento o correo registrado" },
        { status: 409 },
      );
    }

    console.error("Error updating socio", error);
    return NextResponse.json(
      { message: "No fue posible actualizar el socio" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;

    await prisma.socio.delete({
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
        { message: "No existe un socio con ese identificador" },
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
        {
          message:
            "No se puede eliminar el socio porque tiene movimientos, ahorros o prestamos relacionados",
        },
        { status: 409 },
      );
    }

    console.error("Error deleting socio", error);
    return NextResponse.json(
      { message: "No fue posible eliminar el socio" },
      { status: 500 },
    );
  }
}
