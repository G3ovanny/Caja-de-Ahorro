export interface CierreInteresDetalle {
  id?: string;
  socioId: string;
  saldoPromedio: string;
  participacionPct: string;
  montoAsignado: string;
  ahorroId?: string | null;
  socio: {
    id: string;
    nombre: string;
    numeroDocumento: string;
  };
}

export interface CierreInteresPreview {
  anio: number;
  mes: number;
  periodoInicio: string;
  periodoFin: string;
  interesBruto: string;
  porcentajeEmpresa: number;
  porcentajeSocios: number;
  reservaEmpresa: string;
  bolsaSocios: string;
  totalSaldoPromedio: string;
  yaAplicado: boolean;
  cierreId: string | null;
  detalles: CierreInteresDetalle[];
}

export interface CierreInteresListItem {
  id: string;
  anio: number;
  mes: number;
  periodoInicio: string;
  periodoFin: string;
  interesBruto: string;
  porcentajeEmpresa: string;
  porcentajeSocios: string;
  reservaEmpresa: string;
  bolsaSocios: string;
  estado: string;
  aplicadoAt: string;
  createdAt: string;
  cantidadDetalles: number;
}

export interface CierreInteresDetalleResponse extends CierreInteresListItem {
  detalles: CierreInteresDetalle[];
}

const BASE_URL = "/api/cierres-interes";

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

export async function getCierresInteres(): Promise<CierreInteresListItem[]> {
  const res = await fetch(BASE_URL, { method: "GET" });
  return parseJsonResponse<CierreInteresListItem[]>(res);
}

export async function previewCierreInteres(
  anio: number,
  mes: number,
): Promise<CierreInteresPreview> {
  const res = await fetch(`${BASE_URL}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anio, mes }),
  });
  return parseJsonResponse<CierreInteresPreview>(res);
}

export async function aplicarCierreInteres(
  anio: number,
  mes: number,
): Promise<CierreInteresDetalleResponse> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anio, mes }),
  });
  return parseJsonResponse<CierreInteresDetalleResponse>(res);
}

export async function getCierreInteres(
  id: string,
): Promise<CierreInteresDetalleResponse> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "GET" });
  return parseJsonResponse<CierreInteresDetalleResponse>(res);
}
