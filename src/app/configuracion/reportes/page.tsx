"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  downloadLibrosEstadosCuenta,
  downloadMatrizAhorrosMensual,
} from "@/src/lib/api/reportes";
import { getSocios, type Socio } from "@/src/lib/api/socios";
import { SocioSearch } from "@/src/components/socios/SocioSearch";
import { useFeedback } from "@/src/components/ui/FeedbackDialog";
import { useLoading } from "@/src/components/ui/Loading";
import { useToast } from "@/src/components/ui/Toast";
import { getErrorMessage } from "@/src/lib/errors";

type ExportKey = "matriz" | "libros" | null;

const REPORTES = [
  {
    key: "matriz" as const,
    titulo: "Matriz de ahorros mensuales",
    formato: "Excel (.xlsx)",
    destacado: true,
    descripcion:
      "Un solo archivo: socios en filas, meses ene–dic en columnas, una hoja por año. Ideal para control anual de aportes.",
    contenido: [
      "Filas = socios",
      "Columnas = Enero … Diciembre + Total",
      "Una hoja por año calendario",
    ],
  },
  {
    key: "libros" as const,
    titulo: "Libros de estados de cuenta",
    formato: "ZIP (3 Excel)",
    destacado: false,
    descripcion:
      "Paquete profesional con resumen general, libro de ahorros y libro de prestamos — una hoja por socio y movimientos por mes.",
    contenido: [
      "01 Resumen general — indicadores de la caja",
      "02 Libro de ahorros — detalle mensual con saldo corrido",
      "03 Libro de prestamos — cartera, deuda y abonos",
    ],
  },
] as const;

export default function ReportesConfigPage() {
  const toast = useToast();
  const feedback = useFeedback();
  const loading = useLoading();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [socioId, setSocioId] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [isLoadingSocios, setIsLoadingSocios] = useState(true);
  const [exporting, setExporting] = useState<ExportKey>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoadingSocios(true);
      try {
        setSocios(
          await loading.run(() => getSocios(), {
            message: "Cargando socios...",
          }),
        );
      } catch (error) {
        toast.error(getErrorMessage(error, "No fue posible cargar socios"));
      } finally {
        setIsLoadingSocios(false);
      }
    };
    void load();
  }, []);

  const queryParams = useMemo(() => {
    return {
      ...(socioId ? { socioId } : {}),
      ...(desde.trim() ? { desde: new Date(desde).toISOString() } : {}),
      ...(hasta.trim() ? { hasta: new Date(hasta).toISOString() } : {}),
    };
  }, [socioId, desde, hasta]);

  const descargar = async (key: Exclude<ExportKey, null>) => {
    setExporting(key);
    try {
      if (key === "matriz") {
        await loading.run(() => downloadMatrizAhorrosMensual(queryParams), {
          message: "Generando matriz Excel...",
        });
        await feedback.alert({
          title: "Descarga lista",
          message: "Matriz de ahorros descargada correctamente.",
          variant: "success",
        });
      } else {
        await loading.run(() => downloadLibrosEstadosCuenta(queryParams), {
          message: "Generando libros ZIP...",
        });
        await feedback.alert({
          title: "Descarga lista",
          message: "Libros de estados de cuenta descargados (ZIP).",
          variant: "success",
        });
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible descargar el reporte"),
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            <Link href="/configuracion" className="hover:text-slate-700">
              Configuracion
            </Link>
            <span className="mx-1.5 text-slate-300">/</span>
            Reportes
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Exportaciones para control, auditoria y entrega a socios. Elija filtros
            y descargue el formato que necesite.
          </p>
        </div>
        <Link
          href="/estados-cuenta"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          Ver estados en pantalla →
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Filtros del reporte</h2>
        <p className="mt-1 text-sm text-slate-500">
          Aplican a todas las descargas de esta pagina. Deje vacio el periodo para
          incluir todo el historial.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
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
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input
              type="datetime-local"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {REPORTES.map((reporte) => (
          <article
            key={reporte.key}
            className={`flex flex-col rounded-lg border bg-white p-5 shadow-sm ${
              reporte.destacado
                ? "border-emerald-200 ring-1 ring-emerald-100"
                : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{reporte.titulo}</h2>
              {reporte.destacado ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Recomendado
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {reporte.formato}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{reporte.descripcion}</p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
              {reporte.contenido.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-auto pt-5">
              <button
                type="button"
                onClick={() => void descargar(reporte.key)}
                disabled={exporting !== null}
                className={`inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
                  reporte.destacado
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {exporting === reporte.key
                  ? "Generando..."
                  : reporte.key === "matriz"
                    ? "Descargar matriz Excel"
                    : "Descargar libros ZIP"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Proximos reportes</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ideas ya contempladas para ampliar este modulo:
        </p>
        <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <li className="rounded-md border border-slate-200 bg-white px-3 py-2">
            Cartera de prestamos / morosidad
          </li>
          <li className="rounded-md border border-slate-200 bg-white px-3 py-2">
            Resumen de cierres de interes (35% / 65%)
          </li>
          <li className="rounded-md border border-slate-200 bg-white px-3 py-2">
            Movimientos de caja por periodo
          </li>
          <li className="rounded-md border border-slate-200 bg-white px-3 py-2">
            Listado de socios y saldos
          </li>
        </ul>
      </section>
    </div>
  );
}
