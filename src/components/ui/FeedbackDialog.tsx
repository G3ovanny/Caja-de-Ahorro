"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type DialogVariant = "info" | "success" | "danger";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
};

type AlertOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: Exclude<DialogVariant, "danger">;
};

type FeedbackContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

type ActiveDialog =
  | ({
      mode: "confirm";
      resolve: (value: boolean) => void;
    } & ConfirmOptions)
  | ({
      mode: "alert";
      resolve: () => void;
    } & AlertOptions);

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const VARIANT_ICON_CLASS: Record<DialogVariant, string> = {
  info: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
};

const CONFIRM_BUTTON_CLASS: Record<DialogVariant, string> = {
  info: "bg-slate-900 text-white hover:bg-slate-800",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const resolveRef = useRef<ActiveDialog["resolve"] | null>(null);

  const close = useCallback(() => {
    setDialog(null);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        mode: "confirm",
        resolve,
        variant: "danger",
        confirmLabel: "Confirmar",
        cancelLabel: "Cancelar",
        ...options,
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        mode: "alert",
        resolve,
        variant: "info",
        confirmLabel: "Entendido",
        ...options,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  const handleCancel = () => {
    if (!dialog || dialog.mode !== "confirm") return;
    dialog.resolve(false);
    close();
  };

  const handleConfirm = () => {
    if (!dialog) return;
    if (dialog.mode === "confirm") {
      dialog.resolve(true);
    } else {
      dialog.resolve();
    }
    close();
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {dialog ? (
        <FeedbackDialogView
          dialog={dialog}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      ) : null}
    </FeedbackContext.Provider>
  );
}

function FeedbackDialogView({
  dialog,
  onCancel,
  onConfirm,
}: {
  dialog: ActiveDialog;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const variant = dialog.variant ?? (dialog.mode === "confirm" ? "danger" : "info");
  const canCancel = dialog.mode === "confirm";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (canCancel) onCancel();
        else onConfirm();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canCancel, onCancel, onConfirm]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar dialogo"
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => {
          if (canCancel) onCancel();
        }}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span
              className={[
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                VARIANT_ICON_CLASS[variant],
              ].join(" ")}
              aria-hidden="true"
            >
              {variant === "success" ? "OK" : variant === "danger" ? "!" : "i"}
            </span>
            <div className="min-w-0 pt-0.5">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {dialog.title}
              </h2>
              <p
                id={descriptionId}
                className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600"
              >
                {dialog.message}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {canCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {dialog.cancelLabel ?? "Cancelar"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onConfirm}
              className={[
                "rounded-lg px-4 py-2.5 text-sm font-medium transition",
                CONFIRM_BUTTON_CLASS[variant],
              ].join(" ")}
            >
              {dialog.confirmLabel ?? (canCancel ? "Confirmar" : "Entendido")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error("useFeedback debe usarse dentro de FeedbackProvider");
  }
  return context;
}
