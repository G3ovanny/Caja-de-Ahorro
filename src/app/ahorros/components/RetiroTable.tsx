import type { Retiro } from "@/src/lib/api/retiros";

interface RetiroTableProps {
  retiros: Retiro[];
  isLoading: boolean;
}

export function RetiroTable({ retiros, isLoading }: RetiroTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Cargando retiros...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Historial de retiros ({retiros.length})
        </h2>
      </div>

      {!retiros.length ? (
        <div className="px-4 py-6">
          <p className="text-sm text-slate-500">
            Aun no hay retiros registrados para el filtro seleccionado.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 md:hidden">
            {retiros.map((retiro) => (
              <li key={retiro.id} className="space-y-2 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {retiro.socio.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {new Date(retiro.createdAt).toLocaleDateString("es-EC")} ·{" "}
                      {retiro.socio.numeroDocumento}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-amber-700">
                    ${Number(retiro.monto).toFixed(2)}
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  {retiro.descripcion ?? "Retiro de ahorro"}
                </p>
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
                    Descripcion
                  </th>
                </tr>
              </thead>
              <tbody>
                {retiros.map((retiro) => (
                  <tr key={retiro.id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {new Date(retiro.createdAt).toLocaleDateString("es-EC")}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-800">
                      {retiro.socio.nombre}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {retiro.socio.numeroDocumento}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-amber-700">
                      ${Number(retiro.monto).toFixed(2)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      {retiro.descripcion ?? "Retiro de ahorro"}
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
