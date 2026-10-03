import { useId } from "react";
import { FieldGroup } from "@/src/components/forms/FieldGroup";

export interface SocioFormData {
  nombre: string;
  tipoDocumento: "CEDULA" | "PASAPORTE" | "RUC" | "OTRO";
  numeroDocumento: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO" | "RETIRADO";
}

interface SocioFormProps {
  data: SocioFormData;
  onFieldChange: <K extends keyof SocioFormData>(
    field: K,
    value: SocioFormData[K],
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isEditing: boolean;
}

export function SocioForm({
  data,
  onFieldChange,
  onSubmit,
  onCancel,
  isSubmitting,
  isEditing,
}: SocioFormProps) {
  const baseId = useId();
  const fid = (name: string) => `${baseId}-${name}`;

  const isDisabled =
    isSubmitting ||
    !data.nombre.trim() ||
    !data.numeroDocumento.trim() ||
    !data.telefono.trim();

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isDisabled) onSubmit();
      }}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FieldGroup id={fid("nombre")} label="Nombre completo" hint="Como aparecera en listados.">
          <input
            id={fid("nombre")}
            value={data.nombre}
            onChange={(event) => onFieldChange("nombre", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </FieldGroup>

        <FieldGroup
          id={fid("tipoDocumento")}
          label="Tipo de documento"
          hint="Seleccione el documento principal del socio."
        >
          <select
            id={fid("tipoDocumento")}
            value={data.tipoDocumento}
            onChange={(event) =>
              onFieldChange(
                "tipoDocumento",
                event.target.value as SocioFormData["tipoDocumento"],
              )
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="CEDULA">Cedula</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="RUC">RUC</option>
            <option value="OTRO">Otro</option>
          </select>
        </FieldGroup>

        <FieldGroup
          id={fid("numeroDocumento")}
          label="Numero de documento"
          hint="Sin espacios; debe ser unico en el sistema."
        >
          <input
            id={fid("numeroDocumento")}
            value={data.numeroDocumento}
            onChange={(event) => onFieldChange("numeroDocumento", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </FieldGroup>

        <FieldGroup id={fid("telefono")} label="Telefono" hint="Linea principal de contacto.">
          <input
            id={fid("telefono")}
            value={data.telefono}
            onChange={(event) => onFieldChange("telefono", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </FieldGroup>

        <FieldGroup
          id={fid("email")}
          label="Correo electronico"
          hint="Opcional. Si lo indica, no puede repetirse con otro socio."
        >
          <input
            id={fid("email")}
            type="email"
            value={data.email}
            onChange={(event) => onFieldChange("email", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </FieldGroup>

        <FieldGroup
          id={fid("estado")}
          label="Estado del socio"
          hint="Solo socios Activos aparecen en formularios de ahorros y prestamos."
        >
          <select
            id={fid("estado")}
            value={data.estado}
            onChange={(event) =>
              onFieldChange("estado", event.target.value as SocioFormData["estado"])
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="SUSPENDIDO">Suspendido</option>
            <option value="RETIRADO">Retirado</option>
          </select>
        </FieldGroup>

        <div className="md:col-span-2">
          <FieldGroup
            id={fid("direccion")}
            label="Direccion"
            hint="Opcional. Domicilio o referencia para visitas."
          >
            <input
              id={fid("direccion")}
              value={data.direccion}
              onChange={(event) => onFieldChange("direccion", event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </FieldGroup>
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
              : "Creando..."
            : isEditing
              ? "Guardar cambios"
              : "Registrar socio"}
        </button>
      </div>
    </form>
  );
}
