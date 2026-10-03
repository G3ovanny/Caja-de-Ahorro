export type AuthUser = {
  id: string;
  email: string;
  nombre: string;
  rol: "ADMIN" | "OPERADOR" | "SOLO_LECTURA";
  debeCambiarPassword: boolean;
};

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Error inesperado en la solicitud";
    throw new Error(message);
  }

  return payload as T;
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: AuthUser }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseJsonResponse<{ user: AuthUser }>(res);
}

export async function logout(): Promise<void> {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  await parseJsonResponse<{ success: boolean }>(res);
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch("/api/auth/me", { method: "GET", cache: "no-store" });
  return parseJsonResponse<AuthUser>(res);
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; user: AuthUser }> {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<{ success: boolean; user: AuthUser }>(res);
}
