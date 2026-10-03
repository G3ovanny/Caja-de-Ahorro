import type { Socio } from "@/src/lib/api/socios";

interface SocioTableProps {
  socios: Socio[];
  isLoading: boolean;
  onEdit: (socio: Socio) => void;
  onDelete: (socio: Socio) => void;
  deletingSocioId: string | null;
}

function EstadoBadge({ estado }: { estado: Socio["estado"] }) {
  const className =
    estado === "ACTIVO"
      ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
      : estado === "SUSPENDIDO"
        ? "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
        : "inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700";

  return <span className={className}>{estado}</span>;
}

function ActionButtons({
  socio,
  onEdit,
  onDelete,
  deletingSocioId,
  fullWidth = false,
}: {
  socio: Socio;
  onEdit: (socio: Socio) => void;
  onDelete: (socio: Socio) => void;
  deletingSocioId: string | null;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
      <button
        type="button"
        onClick={() => onEdit(socio)}
        className={`rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:py-1.5 ${
          fullWidth ? "w-full" : ""
        }`}
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => onDelete(socio)}
        disabled={deletingSocioId === socio.id}
        className={`rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:py-1.5 ${
          fullWidth ? "w-full" : ""
        }`}
      >
        {deletingSocioId === socio.id ? "Eliminando..." : "Eliminar"}
      </button>
    </div>
  );
}

export function SocioTable({
  socios,
  isLoading,
  onEdit,
  onDelete,
  deletingSocioId,
}: SocioTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Cargando socios...</p>
      </div>
    );
  }

  if (!socios.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-slate-800">No hay socios registrados</p>
        <p className="mt-1 text-sm text-slate-600">
          Usa el boton &quot;Nuevo socio&quot; para registrar el primero.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Listado de socios ({socios.length})
        </h2>
      </div>

      {/* Mobile: cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {socios.map((socio) => (
          <li key={socio.id} className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{socio.nombre}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {socio.tipoDocumento} · {socio.numeroDocumento}
                </p>
              </div>
              <EstadoBadge estado={socio.estado} />
            </div>

            <div className="space-y-1 text-sm text-slate-700">
              <p>{socio.telefono}</p>
              <p className="truncate text-xs text-slate-500">
                {socio.email ?? "Sin correo"}
              </p>
            </div>

            <ActionButtons
              socio={socio}
              onEdit={onEdit}
              onDelete={onDelete}
              deletingSocioId={deletingSocioId}
              fullWidth
            />
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Nombre
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Documento
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Contacto
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Estado
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {socios.map((socio) => (
              <tr key={socio.id} className="odd:bg-white even:bg-slate-50/60">
                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-800">
                  {socio.nombre}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                  <p>{socio.tipoDocumento}</p>
                  <p className="text-xs text-slate-500">{socio.numeroDocumento}</p>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                  <p>{socio.telefono}</p>
                  <p className="text-xs text-slate-500">{socio.email ?? "Sin correo"}</p>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-sm">
                  <EstadoBadge estado={socio.estado} />
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-sm">
                  <ActionButtons
                    socio={socio}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    deletingSocioId={deletingSocioId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
