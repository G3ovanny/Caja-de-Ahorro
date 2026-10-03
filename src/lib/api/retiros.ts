import type { Movimiento } from "@/src/lib/api/movimientos";

export type Retiro = Movimiento;

export interface CreateRetiroPayload {
  socioId: string;
  monto: number;
  fecha?: string;
  descripcion?: string;
}

const BASE_URL = "/api/retiros";

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

export async function getRetiros(): Promise<Retiro[]> {
  const res = await fetch(BASE_URL, { method: "GET" });
  return parseJsonResponse<Retiro[]>(res);
}

export async function createRetiro(data: CreateRetiroPayload): Promise<Retiro> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Retiro>(res);
}
