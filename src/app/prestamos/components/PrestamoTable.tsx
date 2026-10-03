import type { Prestamo } from "@/src/lib/api/prestamos";
import {
  ETIQUETA_ESTADO_PRESTAMO,
  estadoBadgeClass,
  formatMoney,
} from "@/src/app/prestamos/components/prestamoHelpers";

interface PrestamoTableProps {
  prestamos: Prestamo[];
  isLoading: boolean;
  onEdit: (prestamo: Prestamo) => void;
  onAbonar: (prestamo: Prestamo) => void;
  onDelete: (prestamo: Prestamo) => void;
  deletingPrestamoId: string | null;
}

function ActionButtons({
  prestamo,
  onEdit,
  onAbonar,
  onDelete,
  deletingPrestamoId,
  stacked = false,
}: {
  prestamo: Prestamo;
  onEdit: (prestamo: Prestamo) => void;
  onAbonar: (prestamo: Prestamo) => void;
  onDelete: (prestamo: Prestamo) => void;
  deletingPrestamoId: string | null;
  stacked?: boolean;
}) {
  const abonoDisabled =
    prestamo.estado === "CANCELADO" || prestamo.estado === "RECHAZADO";

  return (
    <div
      className={
        stacked
          ? "grid grid-cols-3 gap-2"
          : "flex flex-wrap gap-2"
      }
    >
      <button
        type="button"
        onClick={() => onEdit(prestamo)}
        className={`rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:py-1.5 ${
          stacked ? "w-full" : ""
        }`}
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => onAbonar(prestamo)}
        disabled={abonoDisabled}
        className={`rounded-md border px-3 py-2 text-xs font-medium transition sm:py-1.5 ${
          stacked ? "w-full" : ""
        } ${
          abonoDisabled
            ? "cursor-not-allowed border-slate-200 text-slate-400"
            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        Abonar
      </button>
      <button
        type="button"
        onClick={() => onDelete(prestamo)}
        disabled={deletingPrestamoId === prestamo.id}
        className={`rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:py-1.5 ${
          stacked ? "w-full" : ""
        }`}
      >
        {deletingPrestamoId === prestamo.id ? "..." : "Eliminar"}
      </button>
    </div>
  );
}

export function PrestamoTable({
  prestamos,
  isLoading,
  onEdit,
  onAbonar,
  onDelete,
  deletingPrestamoId,
}: PrestamoTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Cargando prestamos...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Listado de prestamos ({prestamos.length})
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Abonar abre el panel de pagos. Editar corrige tasas o estado.
        </p>
      </div>

      {!prestamos.length ? (
        <div className="px-4 py-6">
          <p className="text-sm text-slate-500">
            No hay prestamos para el filtro seleccionado.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 md:hidden">
            {prestamos.map((prestamo) => (
              <li key={prestamo.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {prestamo.socio.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(prestamo.createdAt).toLocaleDateString("es-EC")} ·{" "}
                      {prestamo.socio.numeroDocumento}
                    </p>
                  </div>
                  <span className={estadoBadgeClass(prestamo.estado)}>
                    {ETIQUETA_ESTADO_PRESTAMO[prestamo.estado].titulo}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Capital</p>
                    <p className="font-semibold text-slate-800">
                      {formatMoney(Number(prestamo.monto))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Saldo</p>
                    <p className="font-semibold text-amber-700">
                      {formatMoney(Number(prestamo.saldo))}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  Int. {Number(prestamo.interes).toFixed(2)}% · Mora{" "}
                  {Number(prestamo.tasaMora).toFixed(2)}% · Pend.{" "}
                  {formatMoney(Number(prestamo.interesPendiente) + Number(prestamo.moraPendiente))}
                </p>

                <ActionButtons
                  prestamo={prestamo}
                  onEdit={onEdit}
                  onAbonar={onAbonar}
                  onDelete={onDelete}
                  deletingPrestamoId={deletingPrestamoId}
                  stacked
                />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full table-auto text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Alta
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Socio
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Capital
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Saldo
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Tasas / pendientes
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
                {prestamos.map((prestamo) => (
                  <tr key={prestamo.id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {new Date(prestamo.createdAt).toLocaleDateString("es-EC")}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-800">
                      <p className="font-medium">{prestamo.socio.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {prestamo.socio.numeroDocumento}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">
                      {formatMoney(Number(prestamo.monto))}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-amber-700">
                      {formatMoney(Number(prestamo.saldo))}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      <span className="block">
                        Interes {Number(prestamo.interes).toFixed(2)}% mensual
                      </span>
                      <span className="block text-xs text-slate-500">
                        Int. pend. {formatMoney(Number(prestamo.interesPendiente))}
                      </span>
                      <span className="mt-1 block">
                        Mora {Number(prestamo.tasaMora).toFixed(2)}% mensual
                      </span>
                      <span className="block text-xs text-slate-500">
                        Mora pend. {formatMoney(Number(prestamo.moraPendiente))}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <span className={estadoBadgeClass(prestamo.estado)}>
                        {ETIQUETA_ESTADO_PRESTAMO[prestamo.estado].titulo}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <ActionButtons
                        prestamo={prestamo}
                        onEdit={onEdit}
                        onAbonar={onAbonar}
                        onDelete={onDelete}
                        deletingPrestamoId={deletingPrestamoId}
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
