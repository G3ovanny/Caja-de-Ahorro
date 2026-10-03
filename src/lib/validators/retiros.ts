import { z } from "zod";

export const createRetiroSchema = z.object({
  socioId: z.string().uuid("El socio seleccionado no es valido"),
  monto: z.coerce.number().positive("El monto del retiro debe ser mayor que cero"),
  fecha: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "La fecha no es valida",
    ),
  descripcion: z
    .string()
    .trim()
    .max(160, "La descripcion no puede superar 160 caracteres")
    .optional(),
});

export type CreateRetiroInput = z.infer<typeof createRetiroSchema>;
