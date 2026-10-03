import { useId } from "react";
import { FieldGroup } from "@/src/components/forms/FieldGroup";
import type { Prestamo, PrestamoPago } from "@/src/lib/api/prestamos";
import {
  ETIQUETA_ESTADO_PRESTAMO,
  estadoBadgeClass,
  formatMoney,
} from "@/src/app/prestamos/components/prestamoHelpers";

export interface DeudaResumen {
  capital: number;
  interes: number;
  mora: number;
  total: number;
}

interface AbonoPanelProps {
  prestamo: Prestamo;
  deuda: DeudaResumen;
  pagos: PrestamoPago[];
  isLoadingPagos: boolean;
  pagoMonto: string;
  pagoFecha: string;
  onPagoMontoChange: (value: string) => void;
  onPagoFechaChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPaying: boolean;
}

export function AbonoPanel({
  prestamo,
  deuda,
  pagos,
  isLoadingPagos,
  pagoMonto,
  pagoFecha,
  onPagoMontoChange,
  onPagoFechaChange,
  onSubmit,
  onCancel,
  isPaying,
}: AbonoPanelProps) {
  const baseId = useId();
  const fid = (name: string) => `${baseId}-${name}`;

  const puedeRegistrarAbono =
    prestamo.estado !== "CANCELADO" && prestamo.estado !== "RECHAZADO";
  const hayDeuda = deuda.total > 0.005;

  const montoNumerico = (() => {
    const normalizado = pagoMonto.trim().replace(",", ".");
    if (normalizado === "") return NaN;
    return Number(normalizado);
  })();

  const isDisabled =
    isPaying ||
    !pagoMonto.trim() ||
    !puedeRegistrarAbono ||
    !hayDeuda ||
    !Number.isFinite(montoNumerico) ||
    montoNumerico <= 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{prestamo.socio.nombre}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {prestamo.socio.numeroDocumento} · Alta{" "}
            {new Date(prestamo.createdAt).toLocaleDateString("es-EC")}
          </p>
        </div>
        <span className={estadoBadgeClass(prestamo.estado)}>
          {ETIQUETA_ESTADO_PRESTAMO[prestamo.estado].titulo}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-4 sm:p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Capital
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
            {formatMoney(deuda.capital)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Interes
          </p>
          <p className="mt-1 text-base font-semibold text-blue-800 sm:text-lg">
            {formatMoney(deuda.interes)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mora</p>
          <p className="mt-1 text-base font-semibold text-rose-800 sm:text-lg">
            {formatMoney(deuda.mora)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total hoy
          </p>
          <p className="mt-1 text-base font-semibold text-amber-800 sm:text-lg">
            {formatMoney(deuda.total)}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        El abono aplica primero mora, luego interes, luego capital.
      </p>

      {!puedeRegistrarAbono ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Este prestamo no admite abonos porque esta{" "}
          {prestamo.estado === "CANCELADO" ? "cancelado" : "rechazado"}.
        </p>
      ) : !hayDeuda ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          No hay deuda pendiente. No se puede registrar otro abono.
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isDisabled) onSubmit();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup
              id={fid("monto")}
              label="Monto del abono"
              hint={`Maximo ${formatMoney(deuda.total)}. Use punto o coma.`}
            >
              <input
                id={fid("monto")}
                value={pagoMonto}
                onChange={(event) => onPagoMontoChange(event.target.value)}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </FieldGroup>

            <FieldGroup
              id={fid("fecha")}
              label="Fecha del abono"
              hint="Vacio = hoy. Define dias de interes/mora."
            >
              <input
                id={fid("fecha")}
                value={pagoFecha}
                onChange={(event) => onPagoFechaChange(event.target.value)}
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </FieldGroup>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPaying}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isDisabled}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:w-auto"
            >
              {isPaying ? "Aplicando abono..." : "Registrar abono"}
            </button>
          </div>
        </form>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Historial de abonos ({pagos.length})
        </p>

        {isLoadingPagos ? (
          <p className="text-sm text-slate-500">Cargando abonos...</p>
        ) : !pagos.length ? (
          <p className="text-sm text-slate-500">Aun no hay abonos registrados.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 md:hidden">
              {pagos.map((pago) => (
                <li key={pago.id} className="space-y-1 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {new Date(pago.fechaPago).toLocaleDateString("es-EC")}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatMoney(Number(pago.monto))}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    Cap. {formatMoney(Number(pago.capitalPagado))} · Int.{" "}
                    {formatMoney(Number(pago.interesPagado))} · Mora{" "}
                    {formatMoney(Number(pago.moraPagada))}
                  </p>
                  <p className="text-xs font-medium text-amber-700">
                    Saldo despues: {formatMoney(Number(pago.saldoNuevo))}
                  </p>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full table-auto text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Fecha
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Total
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Capital
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Interes
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Mora
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Saldo despues
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="odd:bg-white even:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {new Date(pago.fechaPago).toLocaleDateString("es-EC")}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-800">
                        {formatMoney(Number(pago.monto))}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-emerald-700">
                        {formatMoney(Number(pago.capitalPagado))}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-blue-700">
                        {formatMoney(Number(pago.interesPagado))}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-rose-700">
                        {formatMoney(Number(pago.moraPagada))}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 font-semibold text-amber-700">
                        {formatMoney(Number(pago.saldoNuevo))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!puedeRegistrarAbono || !hayDeuda ? (
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  );
}
