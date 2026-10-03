"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { NAV_SECTIONS } from "@/src/components/layout/nav";
import { CloseIcon, NavItemIcon } from "@/src/components/layout/NavIcons";
import { ROL_LABELS } from "@/src/lib/auth/constants";

type AppSidebarProps = {
  onNavigate?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
};

export function AppSidebar({
  onNavigate,
  onClose,
  showCloseButton = false,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();

  const sections =
    user?.rol === "ADMIN"
      ? NAV_SECTIONS
      : NAV_SECTIONS.map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => item.href !== "/configuracion/usuarios",
          ),
        }));

  const activeHref = (() => {
    let best: string | null = null;
    for (const section of sections) {
      for (const item of section.items) {
        const matches =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (matches && (!best || item.href.length > best.length)) {
          best = item.href;
        }
      }
    }
    return best;
  })();

  const isActive = (href: string) => href === activeHref;

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 px-5">
        <Link
          href="/socios"
          onClick={onNavigate}
          className="min-w-0 transition hover:opacity-80"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Sistema
          </p>
          <p className="truncate text-base font-semibold tracking-tight text-slate-900">
            Caja de Ahorro
          </p>
        </Link>

        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label="Cerrar menu"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav
        aria-label="Menu principal"
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
      >
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={[
                        "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition",
                        active
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <NavItemIcon
                        href={item.href}
                        className={[
                          "mt-0.5 h-5 w-5 shrink-0",
                          active
                            ? "text-white"
                            : "text-slate-500 group-hover:text-slate-700",
                        ].join(" ")}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-5">
                          {item.label}
                        </span>
                        <span
                          className={[
                            "mt-0.5 block text-xs leading-4",
                            active ? "text-slate-300" : "text-slate-500",
                          ].join(" ")}
                        >
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4">
        {isLoading ? (
          <p className="text-xs text-slate-400">Cargando sesion...</p>
        ) : user ? (
          <div className="space-y-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {user.nombre}
              </p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {ROL_LABELS[user.rol]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cerrar sesion
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Sin sesion activa</p>
        )}
      </div>
    </aside>
  );
}
