export interface Socio {
  id: string;
  nombre: string;
  tipoDocumento: "CEDULA" | "PASAPORTE" | "RUC" | "OTRO";
  numeroDocumento: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO" | "RETIRADO";
  createdAt: string;
}

export interface SocioPayload {
  nombre: string;
  tipoDocumento: "CEDULA" | "PASAPORTE" | "RUC" | "OTRO";
  numeroDocumento: string;
  telefono: string;
  email?: string;
  direccion?: string;
  estado?: "ACTIVO" | "INACTIVO" | "SUSPENDIDO" | "RETIRADO";
}

const BASE_URL = "/api/socios";

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

export async function getSocios(): Promise<Socio[]> {
  const res = await fetch(BASE_URL, { method: "GET" });
  return parseJsonResponse<Socio[]>(res);
}

export async function createSocio(data: SocioPayload): Promise<Socio> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Socio>(res);
}

export async function updateSocio(id: string, data: SocioPayload): Promise<Socio> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Socio>(res);
}

export async function deleteSocio(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  await parseJsonResponse<{ success: boolean }>(res);
}