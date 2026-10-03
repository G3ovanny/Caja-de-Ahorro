import { useId } from "react";
import { FieldGroup } from "@/src/components/forms/FieldGroup";
import { SocioSearch } from "@/src/components/socios/SocioSearch";
import type { Socio } from "@/src/lib/api/socios";

export interface AhorroFormData {
  socioId: string;
  monto: string;
  fecha: string;
}

interface AhorroFormProps {
  data: AhorroFormData;
  sociosActivos: Socio[];
  onFieldChange: <K extends keyof AhorroFormData>(
    field: K,
    value: AhorroFormData[K],
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEditing: boolean;
}

export function AhorroForm({
  data,
  sociosActivos,
  onFieldChange,
  onSubmit,
  onCancel,
  isSubmitting,
  isEditing,
}: AhorroFormProps) {
  const baseId = useId();
  const fid = (name: string) => `${baseId}-${name}`;

  const isDisabled =
    isSubmitting || !data.socioId || !data.monto.trim() || sociosActivos.length === 0;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isDisabled) onSubmit();
      }}
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldGroup
            id={fid("socio")}
            label="Socio que aporta"
            hint="Busque por nombre, documento o telefono. Solo activos."
          >
            <SocioSearch
              id={fid("socio")}
              socios={sociosActivos}
              value={data.socioId || null}
              onChange={(socioId) => onFieldChange("socioId", socioId ?? "")}
              onlyActivos
              disabled={isSubmitting}
              placeholder="Buscar socio activo..."
            />
          </FieldGroup>
        </div>

        <FieldGroup
          id={fid("monto")}
          label="Monto del aporte"
          hint="Valor en dolares; minimo 0.01."
        >
          <input
            id={fid("monto")}
            value={data.monto}
            onChange={(event) => onFieldChange("monto", event.target.value)}
            type="number"
            min="0.01"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </FieldGroup>

        <FieldGroup
          id={fid("fecha")}
          label="Fecha del aporte"
          hint="Opcional. Vacio = fecha de hoy al guardar."
        >
          <input
            id={fid("fecha")}
            value={data.fecha}
            onChange={(event) => onFieldChange("fecha", event.target.value)}
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </FieldGroup>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isDisabled}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
        >
          {isSubmitting
            ? isEditing
              ? "Actualizando..."
              : "Registrando..."
            : isEditing
              ? "Guardar cambios"
              : "Registrar aporte"}
        </button>
      </div>
    </form>
  );
}
