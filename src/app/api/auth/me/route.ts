import { NextResponse } from "next/server";
import { getCurrentSession } from "@/src/lib/auth/guard";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { message: "No autenticado" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      id: session.id,
      email: session.email,
      nombre: session.nombre,
      rol: session.rol,
      debeCambiarPassword: session.debeCambiarPassword,
    });
  } catch (error) {
    console.error("Error obteniendo sesion", error);
    return NextResponse.json(
      { message: "No fue posible obtener la sesion" },
      { status: 500 },
    );
  }
}
