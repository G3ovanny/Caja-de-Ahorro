export const SESSION_COOKIE_NAME = "caja_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export const PUBLIC_PATHS = ["/login"] as const;
export const PUBLIC_API_PATHS = ["/api/auth/login"] as const;
export const PASSWORD_CHANGE_PATHS = [
  "/cambiar-password",
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/me",
] as const;

export type RolUsuario = "ADMIN" | "OPERADOR" | "SOLO_LECTURA";
export type EstadoUsuario = "ACTIVO" | "INACTIVO";

export const ROL_LABELS: Record<RolUsuario, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  SOLO_LECTURA: "Solo lectura",
};

export function canMutate(rol: RolUsuario): boolean {
  return rol === "ADMIN" || rol === "OPERADOR";
}

export function isAdmin(rol: RolUsuario): boolean {
  return rol === "ADMIN";
}
