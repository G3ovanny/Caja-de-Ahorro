export type PrestamoEstado =
  | "SOLICITADO"
  | "APROBADO"
  | "ACTIVO"
  | "VENCIDO"
  | "CANCELADO"
  | "RECHAZADO";

export interface PrestamoSocioSummary {
  id: string;
  nombre: string;
  numeroDocumento: string;
}

export interface Prestamo {
  id: string;
  monto: string;
  saldo: string;
  interes: string;
  tasaMora: string;
  interesPendiente: string;
  moraPendiente: string;
  fechaVencimiento: string | null;
  ultimoCalculoAt: string | null;
  estado: PrestamoEstado;
  createdAt: string;
  socioId: string;
  socio: PrestamoSocioSummary;
}

export interface PrestamoPago {
  id: string;
  prestamoId: string;
  monto: string;
  interesPagado: string;
  moraPagada: string;
  capitalPagado: string;
  saldoAnterior: string;
  saldoNuevo: string;
  interesGenerado: string;
  moraGenerada: string;
  interesPendiente: string;
  moraPendiente: string;
  fechaPago: string;
  createdAt: string;
}

export interface PrestamoPayload {
  socioId: string;
  monto: number;
  saldo?: number;
  interes: number;
  tasaMora: number;
  fechaVencimiento?: string;
  estado: PrestamoEstado;
}

export interface PrestamoPagoPayload {
  monto: number;
  fechaPago?: string;
}

const BASE_URL = "/api/prestamos";

function formatApiErrorMessage(payload: unknown): string {
  const fallback = "Error inesperado en la solicitud";
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const base =
    typeof record.message === "string" && record.message.trim() !== ""
      ? record.message
      : fallback;

  const errors = record.errors;
  if (!errors || typeof errors !== "object") {
    return base;
  }

  const fieldErrors = (errors as { fieldErrors?: Record<string, unknown> }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") {
    return base;
  }

  const parts: string[] = [];
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (Array.isArray(value)) {
      for (const msg of value) {
        if (typeof msg === "string") {
          parts.push(`${key}: ${msg}`);
        }
      }
    }
  }

  if (!parts.length) {
    return base;
  }

  return `${base} (${parts.join("; ")})`;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(formatApiErrorMessage(payload));
  }

  return payload as T;
}

export async function getPrestamos(): Promise<Prestamo[]> {
  const res = await fetch(BASE_URL, { method: "GET" });
  return parseJsonResponse<Prestamo[]>(res);
}

export async function createPrestamo(data: PrestamoPayload): Promise<Prestamo> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Prestamo>(res);
}

export async function updatePrestamo(
  id: string,
  data: PrestamoPayload,
): Promise<Prestamo> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return parseJsonResponse<Prestamo>(res);
}

export async function deletePrestamo(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });

  await parseJsonResponse<{ success: boolean }>(res);
}

export async function getPrestamoPagos(id: string): Promise<PrestamoPago[]> {
  const res = await fetch(`${BASE_URL}/${id}/pagos`, {
    method: "GET",
  });

  return parseJsonResponse<PrestamoPago[]>(res);
}

export async function createPrestamoPago(
  id: string,
  data: PrestamoPagoPayload,
): Promise<{ prestamo: Prestamo; pago: PrestamoPago }> {
  const res = await fetch(`${BASE_URL}/${id}/pagos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });

  const payload = await parseJsonResponse<{ prestamo: Prestamo; pago: PrestamoPago }>(res);

  if (
    !payload ||
    typeof payload !== "object" ||
    !("prestamo" in payload) ||
    !("pago" in payload) ||
    !payload.prestamo ||
    !payload.pago
  ) {
    throw new Error("La respuesta del servidor al registrar el abono no es valida");
  }

  return payload;
}
