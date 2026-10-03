"use client";

import Link from "next/link";
import { useAuth } from "@/src/components/auth/AuthProvider";

const MODULES = [
  {
    href: "/configuracion/reportes",
    title: "Reportes",
    description:
      "Exportaciones Excel y ZIP: matriz mensual de ahorros, libros de estados de cuenta y mas.",
    status: "Disponible",
    adminOnly: false,
  },
  {
    href: "/configuracion/usuarios",
    title: "Usuarios y roles",
    description:
      "Alta de personal, roles (Admin, Operador, Solo lectura) y control de acceso al sistema.",
    status: "Disponible",
    adminOnly: true,
  },
] as const;

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const modules = MODULES.filter(
    (mod) => !mod.adminOnly || user?.rol === "ADMIN",
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Administracion</p>
        <h1 className="text-2xl font-semibold text-slate-900">Configuracion</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ajustes y herramientas de la caja. Empiece por el modulo de reportes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">
                {mod.title}
              </h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {mod.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{mod.description}</p>
            <p className="mt-4 text-sm font-medium text-blue-700">Abrir modulo →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
