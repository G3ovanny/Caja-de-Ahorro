import type { ReactNode } from "react";

type FieldGroupProps = {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
};

export function FieldGroup({ id, label, hint, children }: FieldGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}
