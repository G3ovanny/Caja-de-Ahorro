"use client";

import { useEffect, useMemo, useState } from "react";
import {
  aplicarCierreInteres,
  getCierreInteres,
  getCierresInteres,
  previewCierreInteres,
  type CierreInteresDetalleResponse,
  type CierreInteresListItem,
  type CierreInteresPreview,
} from "@/src/lib/api/cierresInteres";
import { useFeedback } from "@/src/components/ui/FeedbackDialog";
import { useLoading } from "@/src/components/ui/Loading";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import { getErrorMessage } from "@/src/lib/errors";

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
] as const;

function formatMoney(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function mesLabel(mes: number): string {
  return MESES.find((item) => item.value === mes)?.label ?? String(mes);
}

export default function CierresInteresPage() {
  const toast = useToast();
  const feedback = useFeedback();
  const loading = useLoading();
  const now = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [preview, setPreview] = useState<CierreInteresPreview | null>(null);
  const [historial, setHistorial] = useState<CierreInteresListItem[]>([]);
  const [detalleAbierto, setDetalleAbierto] =
    useState<CierreInteresDetalleResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(true);

  const loadHistorial = async () => {
    setIsLoadingHistorial(true);
    try {
      const data = await loading.run(() => getCierresInteres(), {
        message: "Cargando historial...",
      });
      setHistorial(data);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible cargar el historial de cierres"),
      );
    } finally {
      setIsLoadingHistorial(false);
    }
  };

  useEffect(() => {
    void loadHistorial();
  }, []);

  const handlePreview = async () => {
    setIsLoadingPreview(true);
    try {
      const data = await loading.run(() => previewCierreInteres(anio, mes), {
        message: "Calculando cierre...",
      });
      setPreview(data);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible previsualizar el cierre"),
      );
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleAplicar = async () => {
    if (!preview) return;

    const confirmado = await feedback.confirm({
      title: `Aplicar cierre de ${mesLabel(mes)} ${anio}`,
      message:
        `Interes bruto: ${formatMoney(preview.interesBruto)}\n` +
        `Reserva empresa (35%): ${formatMoney(preview.reservaEmpresa)}\n` +
        `Bolsa socios (65%): ${formatMoney(preview.bolsaSocios)}\n\n` +
        `Se capitalizara en el ahorro de cada socio. Esta accion no se puede deshacer.`,
      confirmLabel: "Aplicar cierre",
      variant: "danger",
    });
    if (!confirmado) return;

    setIsApplying(true);
    try {
      const aplicado = await loading.run(
        () => aplicarCierreInteres(anio, mes),
        { message: "Aplicando cierre..." },
      );
      setPreview({
        ...preview,
        yaAplicado: true,
        cierreId: aplicado.id,
      });
      setDetalleAbierto(aplicado);
      await loadHistorial();
      await feedback.alert({
        title: "Cierre aplicado",
        message: `El cierre de ${mesLabel(mes)} ${anio} se aplico correctamente.`,
        variant: "success",
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible aplicar el cierre"));
    } finally {
      setIsApplying(false);
    }
  };

  const openDetalle = async (id: string) => {
    try {
      const data = await loading.run(() => getCierreInteres(id), {
        message: "Cargando detalle...",
      });
      setDetalleAbierto(data);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible cargar el detalle del cierre"),
      );
    }
  };

  const detallesConMonto =
    preview?.detalles.filter((item) => Number(item.montoAsignado) > 0) ?? [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Gestion</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Cierre de intereses
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Reparte el interes cobrado en el mes: 35% reserva de la cooperativa y
            65% capitalizado en el ahorro de socios activos segun la sumatoria
            total de sus ahorros.
          </p>
        </div>
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-slate-900">Periodo a cerrar</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Mes</span>
            <select
              value={mes}
              onChange={(event) => setMes(Number(event.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {MESES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Anio</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={anio}
              onChange={(event) => setAnio(Number(event.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={isLoadingPreview}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isLoadingPreview ? "Calculando..." : "Previsualizar"}
            </button>
          </div>
        </div>
      </div>

      {preview ? (
        <div className="space-y-4">
          {preview.yaAplicado ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Este mes ya tiene un cierre aplicado. Solo puedes consultar el
              detalle.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Interes bruto
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatMoney(preview.interesBruto)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Reserva 35%
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatMoney(preview.reservaEmpresa)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Bolsa socios 65%
              </p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">
                {formatMoney(preview.bolsaSocios)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Saldo total ahorros
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatMoney(preview.totalSaldoPromedio)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Distribucion por socio
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {detallesConMonto.length} socios con rendimiento &gt; 0
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleAplicar()}
                disabled={
                  isApplying ||
                  preview.yaAplicado ||
                  Number(preview.interesBruto) <= 0
                }
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:w-auto"
              >
                {isApplying ? "Aplicando..." : "Aplicar y capitalizar"}
              </button>
            </div>

            {!preview.detalles.length ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                No hay socios activos para el calculo.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-slate-100 md:hidden">
                  {preview.detalles.map((detalle) => (
                    <li key={detalle.socioId} className="space-y-1 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {detalle.socio.nombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            {detalle.socio.numeroDocumento}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-emerald-700">
                          {formatMoney(detalle.montoAsignado)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-600">
                        Saldo {formatMoney(detalle.saldoPromedio)} ·{" "}
                        {Number(detalle.participacionPct).toFixed(2)}%
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full table-auto text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Socio
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Saldo total
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Participacion
                        </th>
                        <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Rendimiento
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.detalles.map((detalle) => (
                        <tr
                          key={detalle.socioId}
                          className="odd:bg-white even:bg-slate-50/60"
                        >
                          <td className="border-b border-slate-100 px-4 py-3">
                            <p className="font-medium text-slate-800">
                              {detalle.socio.nombre}
                            </p>
                            <p className="text-xs text-slate-500">
                              {detalle.socio.numeroDocumento}
                            </p>
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                            {formatMoney(detalle.saldoPromedio)}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                            {Number(detalle.participacionPct).toFixed(2)}%
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 font-semibold text-emerald-700">
                            {formatMoney(detalle.montoAsignado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Historial de cierres
          </h2>
        </div>

        {isLoadingHistorial ? (
          <p className="px-4 py-6 text-sm text-slate-500">Cargando historial...</p>
        ) : !historial.length ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Aun no hay cierres aplicados.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {historial.map((cierre) => (
                <li key={cierre.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {mesLabel(cierre.mes)} {cierre.anio}
                      </p>
                      <p className="text-xs text-slate-500">
                        Bolsa socios {formatMoney(cierre.bolsaSocios)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openDetalle(cierre.id)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      Ver
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full table-auto text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Periodo
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Interes bruto
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Reserva
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Bolsa socios
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((cierre) => (
                    <tr key={cierre.id} className="odd:bg-white even:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">
                        {mesLabel(cierre.mes)} {cierre.anio}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatMoney(cierre.interesBruto)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                        {formatMoney(cierre.reservaEmpresa)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 font-semibold text-emerald-700">
                        {formatMoney(cierre.bolsaSocios)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void openDetalle(cierre.id)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal
        open={Boolean(detalleAbierto)}
        onClose={() => setDetalleAbierto(null)}
        size="lg"
        title={
          detalleAbierto
            ? `Cierre ${mesLabel(detalleAbierto.mes)} ${detalleAbierto.anio}`
            : "Detalle de cierre"
        }
        description="Rendimientos capitalizados en la cuenta de ahorro de cada socio."
      >
        {detalleAbierto ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-slate-500">Interes bruto</p>
                <p className="font-semibold text-slate-900">
                  {formatMoney(detalleAbierto.interesBruto)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Reserva</p>
                <p className="font-semibold text-slate-900">
                  {formatMoney(detalleAbierto.reservaEmpresa)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Bolsa socios</p>
                <p className="font-semibold text-emerald-700">
                  {formatMoney(detalleAbierto.bolsaSocios)}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {detalleAbierto.detalles.map((detalle) => (
                <li
                  key={detalle.id ?? detalle.socioId}
                  className="flex items-start justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {detalle.socio.nombre}
                    </p>
                    <p className="text-xs text-slate-500">
                      {Number(detalle.participacionPct).toFixed(2)}% · Saldo{" "}
                      {formatMoney(detalle.saldoPromedio)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-emerald-700">
                    {formatMoney(detalle.montoAsignado)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
