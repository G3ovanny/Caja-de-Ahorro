import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth/constants";
import { authenticateUser } from "@/src/lib/auth/login";
import { sessionCookieOptions } from "@/src/lib/auth/session";
import { loginSchema } from "@/src/lib/validators/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Datos de acceso invalidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await authenticateUser(
      parsed.data.email,
      parsed.data.password,
    );

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status },
      );
    }

    const response = NextResponse.json({
      user: {
        id: result.session.sub,
        email: result.session.email,
        nombre: result.session.nombre,
        rol: result.session.rol,
        debeCambiarPassword: result.session.debeCambiarPassword,
      },
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.token,
      sessionCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error("Error en login", error);
    return NextResponse.json(
      { message: "No fue posible iniciar sesion" },
      { status: 500 },
    );
  }
}
