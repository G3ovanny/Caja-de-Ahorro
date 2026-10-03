"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AuthProvider } from "@/src/components/auth/AuthProvider";
import { AppSidebar } from "@/src/components/layout/AppSidebar";
import { getActiveNavLabel } from "@/src/components/layout/nav";
import { MenuIcon } from "@/src/components/layout/NavIcons";
import { FeedbackProvider } from "@/src/components/ui/FeedbackDialog";
import { LoadingProvider } from "@/src/components/ui/Loading";
import { ToastProvider } from "@/src/components/ui/Toast";

type AppShellProps = {
  children: ReactNode;
};

const AUTH_PAGES = new Set(["/login", "/cambiar-password"]);

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentLabel = getActiveNavLabel(pathname);
  const isAuthPage = AUTH_PAGES.has(pathname);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  if (isAuthPage) {
    return (
      <AuthProvider>
        <div className="min-h-full bg-slate-100 text-slate-900">{children}</div>
      </AuthProvider>
    );
  }

  return (
    <ToastProvider>
      <FeedbackProvider>
        <LoadingProvider>
          <AuthProvider>
            <div className="flex min-h-full bg-slate-50 text-slate-900">
              <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
                <AppSidebar />
              </div>

              {isMobileMenuOpen ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                  <button
                    type="button"
                    className="absolute inset-0 bg-slate-900/40"
                    aria-label="Cerrar menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <div
                    id="mobile-sidebar"
                    className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl"
                  >
                    <AppSidebar
                      showCloseButton
                      onClose={() => setIsMobileMenuOpen(false)}
                      onNavigate={() => setIsMobileMenuOpen(false)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex min-h-full w-full flex-1 flex-col lg:pl-72">
                <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
                  <div className="flex h-14 items-center gap-3 px-4">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                      aria-expanded={isMobileMenuOpen}
                      aria-controls="mobile-sidebar"
                      onClick={() => setIsMobileMenuOpen(true)}
                    >
                      <MenuIcon className="h-5 w-5" />
                      <span className="sr-only">Abrir menu</span>
                    </button>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Caja de Ahorro
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {currentLabel}
                      </p>
                    </div>
                  </div>
                </header>

                <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
                  {children}
                </main>
              </div>
            </div>
          </AuthProvider>
        </LoadingProvider>
      </FeedbackProvider>
    </ToastProvider>
  );
}
