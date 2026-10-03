import type { Socio } from "@/src/lib/api/socios";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function socioSearchHaystack(socio: Socio): string {
  return normalizeSearchText(
    [
      socio.nombre,
      socio.tipoDocumento,
      socio.numeroDocumento,
      socio.telefono,
      socio.email ?? "",
      socio.estado,
    ].join(" "),
  );
}

/** True if every token in the query appears in the socio fields. */
export function matchSocio(socio: Socio, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystack = socioSearchHaystack(socio);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

export function filterSocios(socios: Socio[], query: string): Socio[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return socios;
  return socios.filter((socio) => matchSocio(socio, normalizedQuery));
}

export function formatSocioLabel(socio: Socio): string {
  return `${socio.nombre} · ${socio.numeroDocumento}`;
}
