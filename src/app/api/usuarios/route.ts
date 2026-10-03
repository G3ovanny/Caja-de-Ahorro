import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import {
  hashPassword,
  validatePasswordStrength,
} from "@/src/lib/auth/password";
import { prisma } from "@/src/lib/prisma";
import { createUsuarioSchema } from "@/src/lib/validators/auth";

const usuarioSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  estado: true,
  debeCambiarPassword: true,
  ultimoAccesoAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

export async function GET() {
  try {
    const auth = await requireApiAuth({ admin: true });
    if (!isAuthUser(auth)) return auth;

    const usuarios = await prisma.usuario.findMany({
      orderBy: { createdAt: "desc" },
      select: usuarioSelect,
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Error listando usuarios", error);
    return NextResponse.json(
      { message: "No fue posible obtener los usuarios" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth({ admin: true });
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const parsed = createUsuarioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para crear usuario",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const strengthError = validatePasswordStrength(parsed.data.password);
    if (strengthError) {
      return NextResponse.json({ message: strengthError }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const usuario = await prisma.usuario.create({
      data: {
        nombre: parsed.data.nombre,
        email: parsed.data.email,
        passwordHash,
        rol: parsed.data.rol,
        estado: parsed.data.estado,
        debeCambiarPassword: true,
        createdById: auth.id,
      },
      select: usuarioSelect,
    });

    return NextResponse.json(usuario, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Ya existe un usuario con ese correo" },
        { status: 409 },
      );
    }

    console.error("Error creando usuario", error);
    return NextResponse.json(
      { message: "No fue posible crear el usuario" },
      { status: 500 },
    );
  }
}
