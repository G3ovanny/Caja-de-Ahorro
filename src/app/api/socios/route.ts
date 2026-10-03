import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import { prisma } from "@/src/lib/prisma";
import { createSocioSchema } from "@/src/lib/validators/socios";

// GET → listar socios
export async function GET() {
  try {
    const auth = await requireApiAuth();
    if (!isAuthUser(auth)) return auth;

    const socios = await prisma.socio.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(socios);
  } catch (error) {
    console.error("Error listing socios", error);
    return NextResponse.json(
      { message: "No fue posible obtener los socios" },
      { status: 500 },
    );
  }
}

// POST → crear socio
export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth({ mutate: true });
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const result = createSocioSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para crear socio",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const socio = await prisma.socio.create({
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

    return NextResponse.json(socio, { status: 201 });
  } catch (error) {
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

    console.error("Error creating socio", error);
    return NextResponse.json(
      { message: "No fue posible crear el socio" },
      { status: 500 },
    );
  }
}