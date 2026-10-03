import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Correo invalido").toLowerCase(),
  password: z.string().min(1, "La contrasena es requerida"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contrasena actual es requerida"),
    newPassword: z.string().min(8, "Minimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme la contrasena"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

export const createUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre demasiado corto").max(120),
  email: z.string().trim().email("Correo invalido").toLowerCase(),
  password: z.string().min(8, "Minimo 8 caracteres"),
  rol: z.enum(["ADMIN", "OPERADOR", "SOLO_LECTURA"]),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional().default("ACTIVO"),
});

export const updateUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  password: z.string().min(8).optional(),
  rol: z.enum(["ADMIN", "OPERADOR", "SOLO_LECTURA"]).optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  debeCambiarPassword: z.boolean().optional(),
});
