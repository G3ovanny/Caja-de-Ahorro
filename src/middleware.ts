import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  PASSWORD_CHANGE_PATHS,
  PUBLIC_API_PATHS,
  PUBLIC_PATHS,
  SESSION_COOKIE_NAME,
  canMutate,
  type RolUsuario,
} from "@/src/lib/auth/constants";

function getSecret(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

async function readPayload(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = getSecret();
  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.rol !== "string" ||
      typeof payload.debeCambiarPassword !== "boolean"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      rol: payload.rol as RolUsuario,
      debeCambiarPassword: payload.debeCambiarPassword,
    };
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((path) => pathname === path) ||
    PUBLIC_API_PATHS.some((path) => pathname === path)
  );
}

function isPasswordChangePath(pathname: string): boolean {
  return PASSWORD_CHANGE_PATHS.some((path) => pathname === path);
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = await readPayload(request);
  const publicPath = isPublicPath(pathname);

  if (!session) {
    if (publicPath) return NextResponse.next();

    if (isApiPath(pathname)) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login") {
    const destination = session.debeCambiarPassword
      ? "/cambiar-password"
      : "/socios";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (session.debeCambiarPassword && !isPasswordChangePath(pathname)) {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        {
          message: "Debe cambiar su contrasena antes de continuar",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        { status: 403 },
      );
    }

    return NextResponse.redirect(new URL("/cambiar-password", request.url));
  }

  if (
    !session.debeCambiarPassword &&
    pathname === "/cambiar-password"
  ) {
    return NextResponse.redirect(new URL("/socios", request.url));
  }

  const method = request.method.toUpperCase();
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(method);

  if (
    isApiPath(pathname) &&
    isMutation &&
    !pathname.startsWith("/api/auth/") &&
    !canMutate(session.rol)
  ) {
    return NextResponse.json(
      { message: "Su rol solo permite consultas (solo lectura)" },
      { status: 403 },
    );
  }

  if (
    pathname.startsWith("/configuracion/usuarios") &&
    session.rol !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/configuracion", request.url));
  }

  if (
    pathname.startsWith("/api/usuarios") &&
    session.rol !== "ADMIN"
  ) {
    return NextResponse.json(
      { message: "No tiene permisos de administrador" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
