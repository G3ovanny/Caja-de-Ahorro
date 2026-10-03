import { z } from "zod";

export const prestamoEstadoSchema = z.enum([
  "SOLICITADO",
  "APROBADO",
  "ACTIVO",
  "VENCIDO",
  "CANCELADO",
  "RECHAZADO",
]);

export const prestamoPayloadSchema = z.object({
  socioId: z.string().uuid("El socio seleccionado no es valido"),
  monto: z.coerce
    .number()
    .positive("El monto del prestamo debe ser mayor que cero"),
  saldo: z.coerce
    .number()
    .min(0, "El saldo no puede ser negativo")
    .optional(),
  interes: z.coerce
    .number()
    .min(0, "El interes no puede ser negativo")
    .max(100, "El interes no puede superar 100%"),
  tasaMora: z.coerce
    .number()
    .min(0, "La tasa de mora no puede ser negativa")
    .max(100, "La tasa de mora no puede superar 100%")
    .default(0),
  fechaVencimiento: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "La fecha de vencimiento no es valida",
    ),
  estado: prestamoEstadoSchema.default("SOLICITADO"),
});

export const pagoPrestamoSchema = z.object({
  monto: z.coerce
    .number()
    .positive("El monto del abono debe ser mayor que cero"),
  fechaPago: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? undefined : value),
    z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || !Number.isNaN(new Date(value).getTime()),
        "La fecha de pago no es valida",
      ),
  ),
});

export type PrestamoPayloadInput = z.infer<typeof prestamoPayloadSchema>;
export type PagoPrestamoInput = z.infer<typeof pagoPrestamoSchema>;
