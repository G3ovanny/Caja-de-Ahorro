import type { PrestamoEstado } from "@/src/lib/api/prestamos";

export const ESTADOS_PRESTAMO: PrestamoEstado[] = [
  "SOLICITADO",
  "APROBADO",
  "ACTIVO",
  "VENCIDO",
  "CANCELADO",
  "RECHAZADO",
];

export const ETIQUETA_ESTADO_PRESTAMO: Record<
  PrestamoEstado,
  { titulo: string; descripcion: string }
> = {
  SOLICITADO: {
    titulo: "Solicitado",
    descripcion: "En tramite; aun no se entrega dinero al socio.",
  },
  APROBADO: {
    titulo: "Aprobado",
    descripcion: "Aprobado internamente; sin desembolso contable hasta activarlo.",
  },
  ACTIVO: {
    titulo: "Activo",
    descripcion: "Dinero entregado: genera desembolso y admite abonos.",
  },
  VENCIDO: {
    titulo: "Vencido",
    descripcion: "Pasada la fecha de vencimiento: puede generar mora si hay saldo.",
  },
  CANCELADO: {
    titulo: "Cancelado",
    descripcion: "Liquidado: no admite nuevos abonos.",
  },
  RECHAZADO: {
    titulo: "Rechazado",
    descripcion: "No procede el credito.",
  },
};

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function estadoBadgeClass(estado: PrestamoEstado): string {
  if (estado === "ACTIVO" || estado === "APROBADO") {
    return "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700";
  }
  if (estado === "SOLICITADO") {
    return "inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700";
  }
  if (estado === "VENCIDO") {
    return "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700";
  }
  return "inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700";
}
