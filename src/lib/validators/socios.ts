import { z } from "zod";

export const socioEstadoSchema = z.enum([
  "ACTIVO",
  "INACTIVO",
  "SUSPENDIDO",
  "RETIRADO",
]);

export const tipoDocumentoSchema = z.enum([
  "CEDULA",
  "PASAPORTE",
  "RUC",
  "OTRO",
]);

export const createSocioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "El nombre no puede superar 120 caracteres"),
  tipoDocumento: tipoDocumentoSchema,
  numeroDocumento: z
    .string()
    .trim()
    .min(3, "El numero de documento es obligatorio")
    .max(30, "El numero de documento no puede superar 30 caracteres"),
  telefono: z
    .string()
    .trim()
    .min(7, "El telefono debe tener al menos 7 digitos")
    .max(20, "El telefono no puede superar 20 caracteres"),
  email: z
    .string()
    .trim()
    .email("El correo electronico no es valido")
    .max(120, "El correo no puede superar 120 caracteres")
    .optional()
    .or(z.literal("")),
  direccion: z
    .string()
    .trim()
    .max(200, "La direccion no puede superar 200 caracteres")
    .optional()
    .or(z.literal("")),
  estado: socioEstadoSchema.default("ACTIVO"),
});

export type CreateSocioInput = z.infer<typeof createSocioSchema>;
