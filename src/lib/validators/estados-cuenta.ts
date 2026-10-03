import { z } from "zod";

export const estadoCuentaQuerySchema = z.object({
  socioId: z.string().uuid({ message: "Seleccione un socio valido" }).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

export type EstadoCuentaQuery = z.infer<typeof estadoCuentaQuerySchema>;
