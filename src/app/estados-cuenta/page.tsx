"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getEstadosCuenta,
  type EstadoCuentaItem,
  type EstadosCuentaReporte,
} from "@/src/lib/api/estados-cuenta";
import { getSocios, type Socio } from "@/src/lib/api/socios";
import { SocioSearch } from "@/src/components/socios/SocioSearch";
import { useLoading } from "@/src/components/ui/Loading";
import { useToast } from "@/src/components/ui/Toast";
import {
  ETIQUETA_ESTADO_PRESTAMO,
  estadoBadgeClass,
  formatMoney,
} from "@/src/app/prestamos/components/prestamoHelpers";
import { getErrorMessage } from "@/src/lib/errors";

const TIPO_MOVIMIENTO_LABEL: Record<string, string> = {
  APORTE: "Aporte",
  RETIRO: "Retiro",
  DESEMBOLSO_PRESTAMO: "Desembolso prestamo",
  PAGO_PRESTAMO: "Pago prestamo",
  AJUSTE: "Ajuste",
  RENDIMIENTO_AHORRO: "Rendimiento ahorro",
};

const ESTADO_SOCIO_LABEL: Record<Socio["estado"], string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  SUSPENDIDO: "Suspendido",
  RETIRADO: "Retirado",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function moneyFromString(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return formatMoney(amount);
}

function signedMoney(tipo: string, monto: string): { text: string; className: string } {
  const amount = Number(monto);
  const isCargo = tipo === "RETIRO" || tipo === "DESEMBOLSO_PRESTAMO";
  const signed = isCargo ? -Math.abs(amount) : Math.abs(amount);
  const text = formatMoney(signed);
  const className = isCargo ? "text-rose-700" : "text-emerald-700";
  return { text, className };
}

function periodoLabel(periodo: EstadosCuentaReporte["periodo"]): string {
  if (!periodo.desde && !periodo.hasta) {
    return "Todo el historial";
  }

  const desde = periodo.desde ? formatDateTime(periodo.desde) : "Inicio";
  const hasta = periodo.hasta ? formatDateTime(periodo.hasta) : "Actual";
  return `${desde} — ${hasta}`;
}

function EstadoSocioDetalle({ estado }: { estado: EstadoCuentaItem }) {
  return (
    <div className="space-y-4 break-inside-avoid print:break-before-page first:print:break-before-auto">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:border-slate-300 print:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estado de cuenta
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{estado.socio.nombre}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {estado.socio.tipoDocumento}: {estado.socio.numeroDocumento}
            </p>
            <p className="text-sm text-slate-600">
              Tel. {estado.socio.telefono}
              {estado.socio.email ? ` · ${estado.socio.email}` : ""}
            </p>
            {estado.socio.direccion ? (
              <p className="text-sm text-slate-600">{estado.socio.direccion}</p>
            ) : null}
          </div>
          <div className="text-sm text-slate-600 sm:text-right">
            <p>
              Estado socio:{" "}
              <span className="font-medium text-slate-900">
                {ESTADO_SOCIO_LABEL[estado.socio.estado]}
              </span>
            </p>
            <p>
              Saldo ahorro:{" "}
              <span className="font-medium text-emerald-700">
                {moneyFromString(estado.resumenAhorros.saldoDisponible)}
              </span>
            </p>
            <p>
              Deuda prestamos:{" "}
              <span className="font-medium text-amber-700">
                {moneyFromString(estado.resumenPrestamos.totalDeudaEstimada)}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total aportado
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {moneyFromString(estado.resumenAhorros.totalAportado)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total retirado
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {moneyFromString(estado.resumenAhorros.totalRetirado)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Saldo disponible
          </p>
          <p className="mt-2 text-lg font-semibold text-emerald-700">
            {moneyFromString(estado.resumenAhorros.saldoDisponible)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Deuda prestamos
          </p>
          <p className="mt-2 text-lg font-semibold text-amber-700">
            {moneyFromString(estado.resumenPrestamos.totalDeudaEstimada)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {estado.resumenPrestamos.cantidadActivos} activo
            {estado.resumenPrestamos.cantidadActivos === 1 ? "" : "s"} · Capital{" "}
            {moneyFromString(estado.resumenPrestamos.totalCapitalPendiente)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm print:shadow-none">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Prestamos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Monto</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Saldo</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Int. / Mora</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Deuda</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Vence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estado.resumenPrestamos.prestamos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    Sin prestamos registrados.
                  </td>
                </tr>
              ) : (
                estado.resumenPrestamos.prestamos.map((prestamo) => (
                  <tr key={prestamo.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDate(prestamo.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={estadoBadgeClass(prestamo.estado)}>
                        {ETIQUETA_ESTADO_PRESTAMO[prestamo.estado].titulo}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-900">
                      {moneyFromString(prestamo.monto)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-900">
                      {moneyFromString(prestamo.saldo)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">
                      {moneyFromString(prestamo.interesPendiente)} /{" "}
                      {moneyFromString(prestamo.moraPendiente)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
                      {moneyFromString(prestamo.deudaTotal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDate(prestamo.fechaVencimiento)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm print:shadow-none">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Movimientos del periodo</h3>
          <p className="text-xs text-slate-500">
            {estado.movimientos.length} registro
            {estado.movimientos.length === 1 ? "" : "s"} en orden cronologico.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Monto</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripcion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estado.movimientos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No hay movimientos en el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                estado.movimientos.map((movimiento) => {
                  const signed = signedMoney(movimiento.tipo, movimiento.monto);
                  return (
                    <tr key={movimiento.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDateTime(movimiento.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {TIPO_MOVIMIENTO_LABEL[movimiento.tipo] ?? movimiento.tipo}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-medium ${signed.className}`}
                      >
                        {signed.text}
                      </td>
                      <td className="max-w-md px-4 py-3 text-slate-600">
                        {movimiento.descripcion ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function EstadosCuentaPage() {
  const toast = useToast();
  const loading = useLoading();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [socioId, setSocioId] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [reporte, setReporte] = useState<EstadosCuentaReporte | null>(null);
  const [isLoadingSocios, setIsLoadingSocios] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSocios = async () => {
      setIsLoadingSocios(true);
      try {
        const data = await loading.run(() => getSocios(), {
          message: "Cargando socios...",
        });
        setSocios(data);
      } catch (error) {
        toast.error(getErrorMessage(error, "No fue posible cargar los socios"));
      } finally {
        setIsLoadingSocios(false);
      }
    };

    void loadSocios();
  }, []);

  const queryParams = useMemo(() => {
    return {
      ...(socioId ? { socioId } : {}),
      ...(desde.trim() ? { desde: new Date(desde).toISOString() } : {}),
      ...(hasta.trim() ? { hasta: new Date(hasta).toISOString() } : {}),
    };
  }, [socioId, desde, hasta]);

  const generar = async () => {
    setIsLoading(true);

    try {
      const data = await loading.run(() => getEstadosCuenta(queryParams), {
        message: "Generando estado de cuenta...",
      });
      setReporte(data);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible generar el estado de cuenta"),
      );
      setReporte(null);
    } finally {
      setIsLoading(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  const esTodos = reporte?.ambito === "TODOS";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Reportes</p>
          <h1 className="text-2xl font-semibold text-slate-900">Estados de cuenta</h1>
          <p className="text-sm text-slate-600">
            Resumen de ahorros, prestamos y movimientos por socio o de toda la caja.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-2">
            <span className="font-medium text-slate-700">Socio</span>
            <SocioSearch
              socios={socios}
              value={socioId}
              onChange={setSocioId}
              allowClear
              clearLabel="Todos los socios"
              placeholder={isLoadingSocios ? "Cargando socios..." : "Buscar socio..."}
              disabled={isLoadingSocios}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Desde</span>
            <input
              type="datetime-local"
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input
              type="datetime-local"
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => void generar()}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isLoading
              ? "Generando..."
              : socioId
                ? "Generar estado de cuenta"
                : "Generar de todos los socios"}
          </button>
          {reporte ? (
            <button
              type="button"
              onClick={imprimir}
              className="inline-flex w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
            >
              Imprimir
            </button>
          ) : null}
          <Link
            href="/configuracion/reportes"
            className="inline-flex w-full items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100 sm:w-auto"
          >
            Exportar Excel / ZIP
          </Link>
        </div>
      </div>

      {!reporte && !isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500 print:hidden">
          Elija un socio o deje &quot;Todos los socios&quot; y genere el reporte.
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 print:hidden">
          Generando estado de cuenta...
        </div>
      ) : null}

      {reporte ? (
        <div id="estado-cuenta-print" className="space-y-6 print:space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:border-slate-300 print:shadow-none">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {esTodos ? "Reporte consolidado" : "Estado de cuenta"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {esTodos
                    ? `Todos los socios (${reporte.cantidadSocios})`
                    : reporte.estados[0]?.socio.nombre}
                </h2>
                {!esTodos && reporte.estados[0] ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {reporte.estados[0].socio.tipoDocumento}:{" "}
                    {reporte.estados[0].socio.numeroDocumento}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    Totales de ahorros, prestamos y movimientos de la caja.
                  </p>
                )}
              </div>
              <div className="text-sm text-slate-600 sm:text-right">
                <p>
                  Periodo:{" "}
                  <span className="font-medium text-slate-900">
                    {periodoLabel(reporte.periodo)}
                  </span>
                </p>
                <p>
                  Generado:{" "}
                  <span className="font-medium text-slate-900">
                    {formatDateTime(reporte.generadoEn)}
                  </span>
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total aportado
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {moneyFromString(reporte.totales.totalAportado)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total retirado
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {moneyFromString(reporte.totales.totalRetirado)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Saldo disponible
              </p>
              <p className="mt-2 text-xl font-semibold text-emerald-700">
                {moneyFromString(reporte.totales.saldoDisponible)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Deuda prestamos
              </p>
              <p className="mt-2 text-xl font-semibold text-amber-700">
                {moneyFromString(reporte.totales.totalDeudaEstimada)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {reporte.totales.cantidadPrestamosActivos} activo
                {reporte.totales.cantidadPrestamosActivos === 1 ? "" : "s"} ·{" "}
                {reporte.totales.cantidadMovimientos} movimientos
              </p>
            </div>
          </section>

          {esTodos ? (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm print:shadow-none">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Resumen por socio</h3>
                <p className="text-xs text-slate-500">
                  Vista consolidada. El detalle completo aparece debajo.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Socio</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Estado</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">
                        Aportado
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">
                        Retirado
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">
                        Saldo ahorro
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">
                        Deuda prestamos
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">
                        Movimientos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reporte.estados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                          No hay socios registrados.
                        </td>
                      </tr>
                    ) : (
                      reporte.estados.map((estado) => (
                        <tr key={estado.socio.id}>
                          <td className="px-4 py-3 text-slate-900">
                            <div className="font-medium">{estado.socio.nombre}</div>
                            <div className="text-xs text-slate-500">
                              {estado.socio.numeroDocumento}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {ESTADO_SOCIO_LABEL[estado.socio.estado]}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-slate-900">
                            {moneyFromString(estado.resumenAhorros.totalAportado)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-slate-900">
                            {moneyFromString(estado.resumenAhorros.totalRetirado)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-700">
                            {moneyFromString(estado.resumenAhorros.saldoDisponible)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-amber-700">
                            {moneyFromString(estado.resumenPrestamos.totalDeudaEstimada)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                            {estado.movimientos.length}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <div className="space-y-8">
            {reporte.estados.map((estado) => (
              <EstadoSocioDetalle key={estado.socio.id} estado={estado} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
