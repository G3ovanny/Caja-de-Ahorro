"use client";

import { FieldGroup } from "@/src/components/forms/FieldGroup";
import { login } from "@/src/lib/api/auth";
import { getErrorMessage } from "@/src/lib/errors";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { user } = await login(email.trim(), password);
      const next = searchParams.get("next");

      if (user.debeCambiarPassword) {
        router.replace("/cambiar-password");
      } else if (next && next.startsWith("/") && !next.startsWith("//")) {
        router.replace(next);
      } else {
        router.replace("/socios");
      }
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "No fue posible iniciar sesion"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Sistema
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Caja de Ahorro
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Inicie sesion con su cuenta de personal. El acceso es solo por
            invitacion del administrador.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup id="email" label="Correo">
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="usuario@empresa.com"
            />
          </FieldGroup>

          <FieldGroup id="password" label="Contrasena">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="••••••••"
            />
          </FieldGroup>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Verificando..." : "Iniciar sesion"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-slate-100 text-sm text-slate-600">
          Cargando...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
