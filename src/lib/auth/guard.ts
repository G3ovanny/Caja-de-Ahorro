import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import {
  canMutate,
  isAdmin,
  type RolUsuario,
} from "@/src/lib/auth/constants";
import {
  readSessionCookie,
  verifySessionToken,
  type SessionPayload,
} from "@/src/lib/auth/session";

export type AuthUser = SessionPayload & {
  id: string;
};

export async function getCurrentSession(): Promise<AuthUser | null> {
  const token = await readSessionCookie();
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      estado: true,
      debeCambiarPassword: true,
      sessionVersion: true,
    },
  });

  if (!usuario || usuario.estado !== "ACTIVO") return null;
  if (usuario.sessionVersion !== payload.sessionVersion) return null;

  return {
    id: usuario.id,
    sub: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    debeCambiarPassword: usuario.debeCambiarPassword,
    sessionVersion: usuario.sessionVersion,
  };
}

type GuardOptions = {
  /** Requiere permiso de escritura (ADMIN u OPERADOR) */
  mutate?: boolean;
  /** Solo ADMIN */
  admin?: boolean;
  /** Roles permitidos explicitamente */
  roles?: RolUsuario[];
  /** Permite acceso aunque deba cambiar password */
  allowPasswordChange?: boolean;
};

export async function requireApiAuth(
  options: GuardOptions = {},
): Promise<AuthUser | NextResponse> {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { message: "No autenticado" },
      { status: 401 },
    );
  }

  if (session.debeCambiarPassword && !options.allowPasswordChange) {
    return NextResponse.json(
      {
        message: "Debe cambiar su contrasena antes de continuar",
        code: "PASSWORD_CHANGE_REQUIRED",
      },
      { status: 403 },
    );
  }

  if (options.admin && !isAdmin(session.rol)) {
    return NextResponse.json(
      { message: "No tiene permisos de administrador" },
      { status: 403 },
    );
  }

  if (options.mutate && !canMutate(session.rol)) {
    return NextResponse.json(
      { message: "Su rol solo permite consultas (solo lectura)" },
      { status: 403 },
    );
  }

  if (options.roles && !options.roles.includes(session.rol)) {
    return NextResponse.json(
      { message: "No tiene permisos para esta accion" },
      { status: 403 },
    );
  }

  return session;
}

export function isAuthUser(
  value: AuthUser | NextResponse,
): value is AuthUser {
  return !(value instanceof NextResponse);
}
