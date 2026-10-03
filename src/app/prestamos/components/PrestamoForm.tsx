import { useId } from "react";
import { FieldGroup } from "@/src/components/forms/FieldGroup";
import { SocioSearch } from "@/src/components/socios/SocioSearch";
import type { PrestamoEstado } from "@/src/lib/api/prestamos";
import type { Socio } from "@/src/lib/api/socios";
import {
  ESTADOS_PRESTAMO,
  ETIQUETA_ESTADO_PRESTAMO,
} from "@/src/app/prestamos/components/prestamoHelpers";

export interface PrestamoFormData {
  socioId: string;
  monto: string;
  saldo: string;
  interes: string;
  tasaMora: string;
  fechaVencimiento: string;
  estado: PrestamoEstado;
}

interface PrestamoFormProps {
  data: PrestamoFormData;
  sociosActivos: Socio[];
  onFieldChange: <K extends keyof PrestamoFormData>(
    field: K,
    value: PrestamoFormData[K],
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEditing: boolean;
}

export function PrestamoForm({
  data,
  sociosActivos,
  onFieldChange,
  onSubmit,
  onCancel,
  isSubmitting,
  isEditing,
}: PrestamoFormProps) {
  const baseId = useId();
  const fid = (name: string) => `${baseId}-${name}`;

  const isDisabled =
    isSubmitting ||
    !data.socioId ||
    !data.monto.trim() ||
    !data.interes.trim() ||
    sociosActivos.length === 0;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isDisabled) onSubmit();
      }}
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quien y cuanto
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldGroup
                id={fid("socio")}
                label="Socio titular del prestamo"
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

            <div className="sm:col-span-2">
              <FieldGroup
                id={fid("monto")}
                label="Monto del credito (capital total)"
                hint="Principal del prestamo en dolares. No incluye intereses."
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
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tasas y calendario
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FieldGroup
              id={fid("interes")}
              label="Interes (% mensual)"
              hint="Ejemplo: 2 = 2% mensual sobre el saldo capital."
            >
              <input
                id={fid("interes")}
                value={data.interes}
                onChange={(event) => onFieldChange("interes", event.target.value)}
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </FieldGroup>

            <FieldGroup
              id={fid("tasaMora")}
              label="Mora (% mensual)"
              hint="Se aplica tras la fecha de vencimiento si hay deuda."
            >
              <input
                id={fid("tasaMora")}
                value={data.tasaMora}
                onChange={(event) => onFieldChange("tasaMora", event.target.value)}
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </FieldGroup>

            <div className="sm:col-span-2">
              <FieldGroup
                id={fid("fechaVencimiento")}
                label="Fecha de vencimiento"
                hint="Opcional. Define desde cuando puede computarse mora."
              >
                <input
                  id={fid("fechaVencimiento")}
                  value={data.fechaVencimiento}
                  onChange={(event) =>
                    onFieldChange("fechaVencimiento", event.target.value)
                  }
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </FieldGroup>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado y saldo
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FieldGroup
              id={fid("estado")}
              label="Estado del tramite"
              hint="Activo o Vencido implica desembolso contable la primera vez."
            >
              <select
                id={fid("estado")}
                value={data.estado}
                onChange={(event) =>
                  onFieldChange("estado", event.target.value as PrestamoEstado)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {ESTADOS_PRESTAMO.map((estado) => {
                  const meta = ETIQUETA_ESTADO_PRESTAMO[estado];
                  return (
                    <option key={estado} value={estado} title={meta.descripcion}>
                      {meta.titulo} ({estado})
                    </option>
                  );
                })}
              </select>
            </FieldGroup>

            {isEditing ? (
              <FieldGroup
                id={fid("saldo")}
                label="Saldo capital (opcional)"
                hint="En blanco = no cambiar. Lo normal es que baje con abonos."
              >
                <input
                  id={fid("saldo")}
                  value={data.saldo}
                  onChange={(event) => onFieldChange("saldo", event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </FieldGroup>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-800">Saldo inicial</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Al crear, el saldo capital se iguala al monto.
                </p>
              </div>
            )}
          </div>
        </div>
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
              : "Registrar prestamo"}
        </button>
      </div>
    </form>
  );
}
