import type { Ahorro } from "@/src/lib/api/ahorros";

interface AhorroTableProps {
  ahorros: Ahorro[];
  isLoading: boolean;
  onEdit: (ahorro: Ahorro) => void;
  onDelete: (ahorro: Ahorro) => void;
  deletingAhorroId: string | null;
}

function ActionButtons({
  ahorro,
  onEdit,
  onDelete,
  deletingAhorroId,
  fullWidth = false,
}: {
  ahorro: Ahorro;
  onEdit: (ahorro: Ahorro) => void;
  onDelete: (ahorro: Ahorro) => void;
  deletingAhorroId: string | null;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"}>
      <button
        type="button"
        onClick={() => onEdit(ahorro)}
        className={`rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:py-1.5 ${
          fullWidth ? "w-full" : ""
        }`}
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => onDelete(ahorro)}
        disabled={deletingAhorroId === ahorro.id}
        className={`rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:py-1.5 ${
          fullWidth ? "w-full" : ""
        }`}
      >
        {deletingAhorroId === ahorro.id ? "Eliminando..." : "Eliminar"}
      </button>
    </div>
  );
}

export function AhorroTable({
  ahorros,
  isLoading,
  onEdit,
  onDelete,
  deletingAhorroId,
}: AhorroTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Cargando aportes...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Historial de aportes ({ahorros.length})
        </h2>
      </div>

      {!ahorros.length ? (
        <div className="px-4 py-6">
          <p className="text-sm text-slate-500">
            Aun no hay aportes registrados para el filtro seleccionado.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 md:hidden">
            {ahorros.map((ahorro) => (
              <li key={ahorro.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {ahorro.socio.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(ahorro.fecha).toLocaleDateString("es-EC")} ·{" "}
                      {ahorro.socio.numeroDocumento}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-emerald-700">
                    ${Number(ahorro.monto).toFixed(2)}
                  </p>
                </div>
                <ActionButtons
                  ahorro={ahorro}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  deletingAhorroId={deletingAhorroId}
                  fullWidth
                />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Fecha
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Socio
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Documento
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Monto
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {ahorros.map((ahorro) => (
                  <tr key={ahorro.id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {new Date(ahorro.fecha).toLocaleDateString("es-EC")}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-800">
                      {ahorro.socio.nombre}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {ahorro.socio.numeroDocumento}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-emerald-700">
                      ${Number(ahorro.monto).toFixed(2)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm">
                      <ActionButtons
                        ahorro={ahorro}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        deletingAhorroId={deletingAhorroId}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
