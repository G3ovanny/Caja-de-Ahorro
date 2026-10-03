export interface AhorroSocioSummary {
  id: string;
  nombre: string;
  numeroDocumento: string;
}

export interface Ahorro {
  id: string;
  monto: string;
  fecha: string;
  socioId: string;
  socio: AhorroSocioSummary;
}

export interface CreateAhorroPayload {
  socioId: string;
  monto: number;
  fecha?: string;
}

const BASE_URL = "/api/ahorros";

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

export async function getAhorros(): Promise<Ahorro[]> {
  const res = await fetch(BASE_URL, { method: "GET" });
  return parseJsonResponse<Ahorro[]>(res);
}

export async function createAhorro(data: CreateAhorroPayload): Promise<Ahorro> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Ahorro>(res);
}

export async function updateAhorro(
  id: string,
  data: CreateAhorroPayload,
): Promise<Ahorro> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Ahorro>(res);
}

export async function deleteAhorro(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  await parseJsonResponse<{ success: boolean }>(res);
}
