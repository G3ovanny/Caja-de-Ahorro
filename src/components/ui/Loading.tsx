"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type LoadingOptions = {
  message?: string;
};

type LoadingContextValue = {
  isLoading: boolean;
  message: string;
  show: (message?: string) => void;
  hide: () => void;
  run: <T>(action: () => Promise<T>, options?: LoadingOptions) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

const DEFAULT_MESSAGE = "Procesando...";

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const messageStackRef = useRef<string[]>([]);

  const show = useCallback((nextMessage = DEFAULT_MESSAGE) => {
    messageStackRef.current.push(nextMessage);
    setMessage(nextMessage);
    setCount((previous) => previous + 1);
  }, []);

  const hide = useCallback(() => {
    messageStackRef.current.pop();
    const previousMessage =
      messageStackRef.current[messageStackRef.current.length - 1] ??
      DEFAULT_MESSAGE;
    setMessage(previousMessage);
    setCount((previous) => Math.max(0, previous - 1));
  }, []);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, options?: LoadingOptions) => {
      show(options?.message ?? DEFAULT_MESSAGE);
      try {
        return await action();
      } finally {
        hide();
      }
    },
    [hide, show],
  );

  const value = useMemo<LoadingContextValue>(
    () => ({
      isLoading: count > 0,
      message,
      show,
      hide,
      run,
    }),
    [count, hide, message, run, show],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {count > 0 ? <LoadingOverlay message={message} /> : null}
    </LoadingContext.Provider>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/35 p-4 print:hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-xl">
        <span
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900"
          aria-hidden="true"
        />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">{message}</p>
          <p className="mt-1 text-xs text-slate-500">Espere un momento</p>
        </div>
      </div>
    </div>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading debe usarse dentro de LoadingProvider");
  }
  return context;
}
