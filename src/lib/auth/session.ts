import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type RolUsuario,
} from "@/src/lib/auth/constants";

export type SessionPayload = {
  sub: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  debeCambiarPassword: boolean;
  sessionVersion: number;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET no esta configurado o es demasiado corto (minimo 32 caracteres)",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    nombre: payload.nombre,
    rol: payload.rol,
    debeCambiarPassword: payload.debeCambiarPassword,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.nombre !== "string" ||
      typeof payload.rol !== "string" ||
      typeof payload.debeCambiarPassword !== "boolean" ||
      typeof payload.sessionVersion !== "number"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      rol: payload.rol as RolUsuario,
      debeCambiarPassword: payload.debeCambiarPassword,
      sessionVersion: payload.sessionVersion,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
}

export async function readSessionCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value;
}
