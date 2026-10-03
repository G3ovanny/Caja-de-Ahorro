import type { PrestamoEstado } from "@/src/lib/api/prestamos";
import type { MovimientoTipoApi } from "@/src/lib/api/movimientos";
import type { Socio } from "@/src/lib/api/socios";

export interface EstadoCuentaSocio
  extends Pick<
    Socio,
    | "id"
    | "nombre"
    | "tipoDocumento"
    | "numeroDocumento"
    | "telefono"
    | "email"
    | "direccion"
    | "estado"
  > {}

export interface EstadoCuentaPrestamoPago {
  id: string;
  monto: string;
  capitalPagado: string;
  interesPagado: string;
  moraPagada: string;
  saldoAnterior: string;
  saldoNuevo: string;
  fechaPago: string;
}

export interface EstadoCuentaPrestamo {
  id: string;
  monto: string;
  saldo: string;
  interes: string;
  tasaMora: string;
  interesPendiente: string;
  moraPendiente: string;
  deudaTotal: string;
  fechaVencimiento: string | null;
  ultimoCalculoAt: string | null;
  estado: PrestamoEstado;
  createdAt: string;
  pagos: EstadoCuentaPrestamoPago[];
}

export interface EstadoCuentaMovimiento {
  id: string;
  tipo: MovimientoTipoApi;
  monto: string;
  descripcion: string | null;
  referenciaTipo: string | null;
  referenciaId: string | null;
  createdAt: string;
}

export interface EstadoCuentaItem {
  socio: EstadoCuentaSocio;
  resumenAhorros: {
    totalAportado: string;
    totalRetirado: string;
    saldoDisponible: string;
    /** Saldo de ahorro al inicio del periodo filtrado (0 si no hay filtro desde). */
    saldoInicialPeriodo: string;
  };
  resumenPrestamos: {
    totalCapitalPendiente: string;
    totalDeudaEstimada: string;
    cantidadActivos: number;
    prestamos: EstadoCuentaPrestamo[];
  };
  movimientos: EstadoCuentaMovimiento[];
}

export interface EstadosCuentaReporte {
  ambito: "SOCIO" | "TODOS";
  periodo: {
    desde: string | null;
    hasta: string | null;
  };
  generadoEn: string;
  cantidadSocios: number;
  totales: {
    totalAportado: string;
    totalRetirado: string;
    saldoDisponible: string;
    totalCapitalPendiente: string;
    totalDeudaEstimada: string;
    cantidadPrestamosActivos: number;
    cantidadMovimientos: number;
  };
  estados: EstadoCuentaItem[];
}

export interface EstadoCuentaQueryParams {
  socioId?: string;
  desde?: string;
  hasta?: string;
}

const BASE_URL = "/api/estados-cuenta";

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

function buildQuery(params: EstadoCuentaQueryParams): string {
  const search = new URLSearchParams();

  if (params.socioId) {
    search.set("socioId", params.socioId);
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

export async function getEstadosCuenta(
  params: EstadoCuentaQueryParams = {},
): Promise<EstadosCuentaReporte> {
  const res = await fetch(`${BASE_URL}${buildQuery(params)}`, { method: "GET" });
  return parseJsonResponse<EstadosCuentaReporte>(res);
}

export function getEstadosCuentaExcelUrl(
  params: EstadoCuentaQueryParams = {},
): string {
  return `${BASE_URL}/excel${buildQuery(params)}`;
}

export async function downloadEstadosCuentaExcel(
  params: EstadoCuentaQueryParams = {},
): Promise<void> {
  const res = await fetch(getEstadosCuentaExcelUrl(params), { method: "GET" });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "No fue posible descargar el Excel";
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "ahorros-mensualizados.xlsx";

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
