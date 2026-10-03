"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getMovimientos,
  type Movimiento,
  type MovimientoTipoApi,
} from "@/src/lib/api/movimientos";
import { getSocios, type Socio } from "@/src/lib/api/socios";
import { SocioSearch } from "@/src/components/socios/SocioSearch";
import { useLoading } from "@/src/components/ui/Loading";
import { useToast } from "@/src/components/ui/Toast";
import { getErrorMessage } from "@/src/lib/errors";

const TIPOS: { value: MovimientoTipoApi | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos los tipos" },
  { value: "APORTE", label: "Aporte" },
  { value: "RETIRO", label: "Retiro" },
  { value: "DESEMBOLSO_PRESTAMO", label: "Desembolso prestamo" },
  { value: "PAGO_PRESTAMO", label: "Pago prestamo" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "RENDIMIENTO_AHORRO", label: "Rendimiento ahorro" },
];

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function MovimientosPage() {
  const toast = useToast();
  const loading = useLoading();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [filterSocioId, setFilterSocioId] = useState("ALL");
  const [filterTipo, setFilterTipo] = useState<MovimientoTipoApi | "ALL">("ALL");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const queryParams = useMemo(() => {
    return {
      ...(filterSocioId !== "ALL" ? { socioId: filterSocioId } : {}),
      ...(filterTipo !== "ALL" ? { tipo: filterTipo } : {}),
      ...(desde.trim() ? { desde: new Date(desde).toISOString() } : {}),
      ...(hasta.trim() ? { hasta: new Date(hasta).toISOString() } : {}),
    };
  }, [filterSocioId, filterTipo, desde, hasta]);

  const load = async () => {
    setIsLoading(true);

    try {
      const [movimientosData, sociosData] = await loading.run(
        () => Promise.all([getMovimientos(queryParams), getSocios()]),
        { message: "Cargando movimientos..." },
      );
      setMovimientos(movimientosData);
      setSocios(sociosData);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible cargar el libro de movimientos"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga explicita con boton o deps de queryParams
  }, []);

  const totalMonto = useMemo(
    () =>
      movimientos.reduce((accumulator, movimiento) => {
        return accumulator + Number(movimiento.monto);
      }, 0),
    [movimientos],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Libro de movimientos</h1>
          <p className="text-sm text-slate-600">
            Registro contable trazable de aportes, retiros, desembolsos y pagos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Actualizar
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Socio</span>
            <SocioSearch
              socios={socios}
              value={filterSocioId === "ALL" ? null : filterSocioId}
              onChange={(socioId) => setFilterSocioId(socioId ?? "ALL")}
              allowClear
              clearLabel="Todos los socios"
              placeholder="Buscar socio..."
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Tipo</span>
            <select
              value={filterTipo}
              onChange={(event) =>
                setFilterTipo(event.target.value as MovimientoTipoApi | "ALL")
              }
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {TIPOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
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

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Aplicar filtros
          </button>
          <p className="text-sm text-slate-600">
            Total en resultados:{" "}
            <span className="font-semibold text-slate-900">{formatMoney(String(totalMonto))}</span>
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Socio</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Monto</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripcion</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Referencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No hay movimientos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                movimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDateTime(movimiento.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      <div className="font-medium">{movimiento.socio.nombre}</div>
                      <div className="text-xs text-slate-500">{movimiento.socio.numeroDocumento}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {TIPOS.find((t) => t.value === movimiento.tipo)?.label ?? movimiento.tipo}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
                      {formatMoney(movimiento.monto)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {movimiento.descripcion ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {movimiento.referenciaTipo && movimiento.referenciaId ? (
                        <span className="font-mono">
                          {movimiento.referenciaTipo}:{movimiento.referenciaId}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
