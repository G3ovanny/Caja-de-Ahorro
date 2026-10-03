import { prisma } from "@/src/lib/prisma";
import {
  LOCKOUT_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "@/src/lib/auth/constants";
import { verifyPassword } from "@/src/lib/auth/password";
import { signSession, type SessionPayload } from "@/src/lib/auth/session";

export type LoginResult =
  | { ok: true; token: string; session: SessionPayload }
  | { ok: false; message: string; status: number };

export async function authenticateUser(
  email: string,
  password: string,
): Promise<LoginResult> {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!usuario) {
    return {
      ok: false,
      message: "Correo o contrasena incorrectos",
      status: 401,
    };
  }

  if (usuario.estado !== "ACTIVO") {
    return {
      ok: false,
      message: "La cuenta esta inactiva. Contacte al administrador.",
      status: 403,
    };
  }

  if (usuario.lockedUntil && usuario.lockedUntil > new Date()) {
    const minutes = Math.ceil(
      (usuario.lockedUntil.getTime() - Date.now()) / 60_000,
    );
    return {
      ok: false,
      message: `Cuenta bloqueada temporalmente. Intente en ${minutes} minuto(s).`,
      status: 423,
    };
  }

  const valid = await verifyPassword(password, usuario.passwordHash);

  if (!valid) {
    const attempts = usuario.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
        : null;

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        failedLoginAttempts: attempts >= MAX_FAILED_LOGIN_ATTEMPTS ? 0 : attempts,
        lockedUntil,
      },
    });

    if (lockedUntil) {
      return {
        ok: false,
        message: `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos.`,
        status: 423,
      };
    }

    return {
      ok: false,
      message: "Correo o contrasena incorrectos",
      status: 401,
    };
  }

  const updated = await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      ultimoAccesoAt: new Date(),
    },
  });

  const session: SessionPayload = {
    sub: updated.id,
    email: updated.email,
    nombre: updated.nombre,
    rol: updated.rol,
    debeCambiarPassword: updated.debeCambiarPassword,
    sessionVersion: updated.sessionVersion,
  };

  const token = await signSession(session);

  return { ok: true, token, session };
}
