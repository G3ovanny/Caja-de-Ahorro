import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "La contrasena debe tener al menos 8 caracteres";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contrasena debe incluir al menos una mayuscula";
  }
  if (!/[a-z]/.test(password)) {
    return "La contrasena debe incluir al menos una minuscula";
  }
  if (!/[0-9]/.test(password)) {
    return "La contrasena debe incluir al menos un numero";
  }
  return null;
}
