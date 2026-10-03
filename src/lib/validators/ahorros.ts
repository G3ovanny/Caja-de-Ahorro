import { z } from "zod";

export const createAhorroSchema = z.object({
  socioId: z.string().uuid("El socio seleccionado no es valido"),
  monto: z.coerce
    .number()
    .positive("El monto del ahorro debe ser mayor que cero"),
  fecha: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "La fecha no es valida",
    ),
});

export type CreateAhorroInput = z.infer<typeof createAhorroSchema>;
