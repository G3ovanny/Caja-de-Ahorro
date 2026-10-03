export type MovimientoTipoApi =
  | "APORTE"
  | "RETIRO"
  | "DESEMBOLSO_PRESTAMO"
  | "PAGO_PRESTAMO"
  | "AJUSTE"
  | "RENDIMIENTO_AHORRO";

export interface MovimientoSocioSummary {
  id: string;
  nombre: string;
  numeroDocumento: string;
}

export interface Movimiento {
  id: string;
  tipo: MovimientoTipoApi;
  monto: string;
  descripcion: string | null;
  referenciaTipo: string | null;
  referenciaId: string | null;
  createdAt: string;
  updatedAt: string;
  socioId: string;
  socio: MovimientoSocioSummary;
}

export interface MovimientosQueryParams {
  socioId?: string;
  tipo?: MovimientoTipoApi;
  desde?: string;
  hasta?: string;
}

const BASE_URL = "/api/movimientos";

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

function buildQuery(params: MovimientosQueryParams): string {
  const search = new URLSearchParams();

  if (params.socioId) {
    search.set("socioId", params.socioId);
  }

  if (params.tipo) {
    search.set("tipo", params.tipo);
  }

  if (params.desde) {
    search.set("desde", params.desde);
  }

  if (params.hasta) {
    search.set("hasta", params.hasta);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function getMovimientos(
  params: MovimientosQueryParams = {},
): Promise<Movimiento[]> {
  const res = await fetch(`${BASE_URL}${buildQuery(params)}`, { method: "GET" });
  return parseJsonResponse<Movimiento[]>(res);
}
