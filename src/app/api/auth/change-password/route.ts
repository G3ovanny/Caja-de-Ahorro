import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth/constants";
import { isAuthUser, requireApiAuth } from "@/src/lib/auth/guard";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "@/src/lib/auth/password";
import { sessionCookieOptions, signSession } from "@/src/lib/auth/session";
import { prisma } from "@/src/lib/prisma";
import { changePasswordSchema } from "@/src/lib/validators/auth";

export async function POST(req: Request) {
  try {
    const auth = await requireApiAuth({ allowPasswordChange: true });
    if (!isAuthUser(auth)) return auth;

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const strengthError = validatePasswordStrength(parsed.data.newPassword);
    if (strengthError) {
      return NextResponse.json({ message: strengthError }, { status: 400 });
    }

    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return NextResponse.json(
        { message: "La nueva contrasena debe ser distinta a la actual" },
        { status: 400 },
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: auth.id },
    });

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    const valid = await verifyPassword(
      parsed.data.currentPassword,
      usuario.passwordHash,
    );

    if (!valid) {
      return NextResponse.json(
        { message: "La contrasena actual es incorrecta" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    const updated = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        passwordHash,
        debeCambiarPassword: false,
        sessionVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const token = await signSession({
      sub: updated.id,
      email: updated.email,
      nombre: updated.nombre,
      rol: updated.rol,
      debeCambiarPassword: updated.debeCambiarPassword,
      sessionVersion: updated.sessionVersion,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        nombre: updated.nombre,
        rol: updated.rol,
        debeCambiarPassword: updated.debeCambiarPassword,
      },
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error("Error cambiando contrasena", error);
    return NextResponse.json(
      { message: "No fue posible cambiar la contrasena" },
      { status: 500 },
    );
  }
}
