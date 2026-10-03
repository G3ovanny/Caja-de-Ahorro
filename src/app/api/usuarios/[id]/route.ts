import { NextResponse } from "next/server";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import {
  hashPassword,
  validatePasswordStrength,
} from "@/src/lib/auth/password";
import { prisma } from "@/src/lib/prisma";
import { updateUsuarioSchema } from "@/src/lib/validators/auth";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ admin: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    });

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("Error obteniendo usuario", error);
    return NextResponse.json(
      { message: "No fue posible obtener el usuario" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ admin: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateUsuarioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos para actualizar usuario",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const existing = await prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    if (
      existing.id === auth.id &&
      parsed.data.estado === "INACTIVO"
    ) {
      return NextResponse.json(
        { message: "No puede desactivar su propia cuenta" },
        { status: 400 },
      );
    }

    if (
      existing.id === auth.id &&
      parsed.data.rol &&
      parsed.data.rol !== "ADMIN"
    ) {
      return NextResponse.json(
        { message: "No puede quitarse el rol de administrador" },
        { status: 400 },
      );
    }

    if (parsed.data.password) {
      const strengthError = validatePasswordStrength(parsed.data.password);
      if (strengthError) {
        return NextResponse.json({ message: strengthError }, { status: 400 });
      }
    }

    const passwordHash = parsed.data.password
      ? await hashPassword(parsed.data.password)
      : undefined;

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: parsed.data.nombre,
        email: parsed.data.email,
        rol: parsed.data.rol,
        estado: parsed.data.estado,
        debeCambiarPassword: parsed.data.debeCambiarPassword,
        ...(passwordHash
          ? {
              passwordHash,
              debeCambiarPassword:
                parsed.data.debeCambiarPassword ?? true,
              sessionVersion: { increment: 1 },
            }
          : {}),
      },
      select: usuarioSelect,
    });

    return NextResponse.json(usuario);
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

    console.error("Error actualizando usuario", error);
    return NextResponse.json(
      { message: "No fue posible actualizar el usuario" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const auth = await requireApiAuth({ admin: true });
    if (!isAuthUser(auth)) return auth;

    const { id } = await context.params;

    if (id === auth.id) {
      return NextResponse.json(
        { message: "No puede eliminar su propia cuenta" },
        { status: 400 },
      );
    }

    const existing = await prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    // Soft-delete: desactivar en lugar de borrar historial
    await prisma.usuario.update({
      where: { id },
      data: {
        estado: "INACTIVO",
        sessionVersion: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando usuario", error);
    return NextResponse.json(
      { message: "No fue posible eliminar el usuario" },
      { status: 500 },
    );
  }
}
