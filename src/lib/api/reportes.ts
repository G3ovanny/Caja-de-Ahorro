export interface ReporteQueryParams {
  socioId?: string;
  desde?: string;
  hasta?: string;
}

function buildQuery(params: ReporteQueryParams): string {
  const search = new URLSearchParams();
  if (params.socioId) search.set("socioId", params.socioId);
  if (params.desde) search.set("desde", params.desde);
  if (params.hasta) search.set("hasta", params.hasta);
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function downloadBinary(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "No fue posible descargar el reporte";
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadMatrizAhorrosMensual(
  params: ReporteQueryParams = {},
): Promise<void> {
  await downloadBinary(
    `/api/reportes/matriz-ahorros${buildQuery(params)}`,
    "ahorros-mensualizados.xlsx",
  );
}

export async function downloadLibrosEstadosCuenta(
  params: ReporteQueryParams = {},
): Promise<void> {
  await downloadBinary(
    `/api/reportes/libros-estados${buildQuery(params)}`,
    "libros-estados-cuenta.zip",
  );
}
