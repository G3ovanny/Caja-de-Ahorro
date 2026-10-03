export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "OPERADOR" | "SOLO_LECTURA";
  estado: "ACTIVO" | "INACTIVO";
  debeCambiarPassword: boolean;
  ultimoAccesoAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
};

export type UsuarioPayload = {
  nombre: string;
  email: string;
  password?: string;
  rol: "ADMIN" | "OPERADOR" | "SOLO_LECTURA";
  estado?: "ACTIVO" | "INACTIVO";
  debeCambiarPassword?: boolean;
};

const BASE_URL = "/api/usuarios";

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Error inesperado en la solicitud";
    throw new Error(message);
  }

  return payload as T;
}

export async function getUsuarios(): Promise<Usuario[]> {
  const res = await fetch(BASE_URL, { method: "GET" });
  return parseJsonResponse<Usuario[]>(res);
}

export async function createUsuario(
  data: UsuarioPayload & { password: string },
): Promise<Usuario> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Usuario>(res);
}

export async function updateUsuario(
  id: string,
  data: UsuarioPayload,
): Promise<Usuario> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Usuario>(res);
}

export async function deleteUsuario(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  await parseJsonResponse<{ success: boolean }>(res);
}
