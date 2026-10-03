import { MovimientoTipo } from "@prisma/client";
import { z } from "zod";

export const movimientosQuerySchema = z.object({
  socioId: z.string().uuid().optional(),
  tipo: z.nativeEnum(MovimientoTipo).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

export type MovimientosQuery = z.infer<typeof movimientosQuerySchema>;
