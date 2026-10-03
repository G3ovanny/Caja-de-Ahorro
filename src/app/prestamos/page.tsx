"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPrestamo,
  createPrestamoPago,
  deletePrestamo,
  getPrestamoPagos,
  getPrestamos,
  updatePrestamo,
  type Prestamo,
  type PrestamoEstado,
  type PrestamoPago,
} from "@/src/lib/api/prestamos";
import { getSocios, type Socio } from "@/src/lib/api/socios";
import { useFeedback } from "@/src/components/ui/FeedbackDialog";
import { useLoading } from "@/src/components/ui/Loading";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import { SocioSearch } from "@/src/components/socios/SocioSearch";
import {
  PrestamoForm,
  type PrestamoFormData,
} from "@/src/app/prestamos/components/PrestamoForm";
import { AbonoPanel } from "@/src/app/prestamos/components/AbonoPanel";
import { PrestamoTable } from "@/src/app/prestamos/components/PrestamoTable";
import {
  ESTADOS_PRESTAMO,
  ETIQUETA_ESTADO_PRESTAMO,
  formatMoney,
} from "@/src/app/prestamos/components/prestamoHelpers";
import { getErrorMessage } from "@/src/lib/errors";

const initialFormData: PrestamoFormData = {
  socioId: "",
  monto: "",
  saldo: "",
  interes: "",
  tasaMora: "0",
  fechaVencimiento: "",
  estado: "SOLICITADO",
};

export default function PrestamosPage() {
  const toast = useToast();
  const feedback = useFeedback();
  const loading = useLoading();
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [formData, setFormData] = useState<PrestamoFormData>(initialFormData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);
  const [editingPrestamoId, setEditingPrestamoId] = useState<string | null>(null);
  const [deletingPrestamoId, setDeletingPrestamoId] = useState<string | null>(null);
  const [filterSocioId, setFilterSocioId] = useState("ALL");
  const [filterEstado, setFilterEstado] = useState<PrestamoEstado | "ALL">("ALL");
  const [selectedPrestamoId, setSelectedPrestamoId] = useState<string | null>(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoFecha, setPagoFecha] = useState("");
  const [pagosPrestamo, setPagosPrestamo] = useState<PrestamoPago[]>([]);
  const [isLoadingPagos, setIsLoadingPagos] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const sociosActivos = useMemo(
    () => socios.filter((socio) => socio.estado === "ACTIVO"),
    [socios],
  );

  const defaultSocioId = sociosActivos[0]?.id ?? "";

  const filteredPrestamos = useMemo(() => {
    return prestamos.filter((prestamo) => {
      const matchesSocio =
        filterSocioId === "ALL" ? true : prestamo.socioId === filterSocioId;
      const matchesEstado =
        filterEstado === "ALL" ? true : prestamo.estado === filterEstado;
      return matchesSocio && matchesEstado;
    });
  }, [prestamos, filterEstado, filterSocioId]);

  const totalDesembolsado = useMemo(
    () =>
      filteredPrestamos.reduce(
        (accumulator, prestamo) => accumulator + Number(prestamo.monto),
        0,
      ),
    [filteredPrestamos],
  );

  const totalSaldoPendiente = useMemo(
    () =>
      filteredPrestamos.reduce(
        (accumulator, prestamo) => accumulator + Number(prestamo.saldo),
        0,
      ),
    [filteredPrestamos],
  );

  const selectedPrestamo = useMemo(
    () => prestamos.find((prestamo) => prestamo.id === selectedPrestamoId) ?? null,
    [prestamos, selectedPrestamoId],
  );

  const deudaSeleccionada = useMemo(() => {
    if (!selectedPrestamo) return null;
    const capital = Number(selectedPrestamo.saldo);
    const interes = Number(selectedPrestamo.interesPendiente);
    const mora = Number(selectedPrestamo.moraPendiente);
    return {
      capital,
      interes,
      mora,
      total: capital + interes + mora,
    };
  }, [selectedPrestamo]);

  const load = async () => {
    setIsLoading(true);

    try {
      const [prestamosData, sociosData] = await loading.run(
        () => Promise.all([getPrestamos(), getSocios()]),
        { message: "Cargando prestamos..." },
      );
      setPrestamos(prestamosData);
      setSocios(sociosData);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible cargar el modulo de prestamos"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const closeForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setEditingPrestamoId(null);
    setFormData(initialFormData);
  };

  const closeAbono = () => {
    if (isPaying) return;
    setIsAbonoOpen(false);
    setSelectedPrestamoId(null);
    setPagosPrestamo([]);
    setPagoMonto("");
    setPagoFecha("");
  };

  const openCreate = () => {
    setEditingPrestamoId(null);
    setFormData({
      ...initialFormData,
      socioId: defaultSocioId,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.socioId || !formData.monto.trim() || !formData.interes.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const saldoPayload =
        editingPrestamoId && formData.saldo.trim() !== ""
          ? Number(formData.saldo)
          : undefined;

      const payload = {
        socioId: formData.socioId,
        monto: Number(formData.monto),
        ...(saldoPayload !== undefined ? { saldo: saldoPayload } : {}),
        interes: Number(formData.interes),
        tasaMora: Number(formData.tasaMora || "0"),
        fechaVencimiento: formData.fechaVencimiento || undefined,
        estado: formData.estado,
      };

      if (editingPrestamoId) {
        const updatedPrestamo = await loading.run(
          () => updatePrestamo(editingPrestamoId, payload),
          { message: "Guardando prestamo..." },
        );
        setPrestamos((previous) =>
          previous.map((item) =>
            item.id === updatedPrestamo.id ? updatedPrestamo : item,
          ),
        );
        setIsFormOpen(false);
        setEditingPrestamoId(null);
        setFormData(initialFormData);
        await feedback.alert({
          title: "Prestamo actualizado",
          message: "Las condiciones del prestamo se guardaron correctamente.",
          variant: "success",
        });
      } else {
        const createdPrestamo = await loading.run(
          () => createPrestamo(payload),
          { message: "Registrando prestamo..." },
        );
        setPrestamos((previous) => [createdPrestamo, ...previous]);
        setIsFormOpen(false);
        setEditingPrestamoId(null);
        setFormData(initialFormData);
        await feedback.alert({
          title: "Prestamo registrado",
          message: "El prestamo se creo correctamente.",
          variant: "success",
        });
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingPrestamoId
            ? "No fue posible actualizar prestamo"
            : "No fue posible registrar prestamo",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (prestamo: Prestamo) => {
    setEditingPrestamoId(prestamo.id);
    setFormData({
      socioId: prestamo.socioId,
      monto: Number(prestamo.monto).toFixed(2),
      saldo: Number(prestamo.saldo).toFixed(2),
      interes: Number(prestamo.interes).toFixed(2),
      tasaMora: Number(prestamo.tasaMora).toFixed(2),
      fechaVencimiento: prestamo.fechaVencimiento
        ? new Date(prestamo.fechaVencimiento).toISOString().slice(0, 10)
        : "",
      estado: prestamo.estado,
    });
    setIsFormOpen(true);
  };

  const handleSelectPrestamoForPayment = async (prestamo: Prestamo) => {
    setSelectedPrestamoId(prestamo.id);
    setPagoMonto("");
    setPagoFecha("");
    setIsAbonoOpen(true);
    setIsLoadingPagos(true);

    try {
      const pagos = await loading.run(() => getPrestamoPagos(prestamo.id), {
        message: "Cargando abonos...",
      });
      setPagosPrestamo(pagos);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible cargar pagos del prestamo"),
      );
    } finally {
      setIsLoadingPagos(false);
    }
  };

  const handleRegistrarAbono = async () => {
    if (!selectedPrestamo || !deudaSeleccionada) return;

    if (!pagoMonto.trim()) {
      toast.error("Indique el monto del abono.");
      return;
    }

    const normalizado = pagoMonto.trim().replace(",", ".");
    const montoAbonoNumerico = Number(normalizado);

    if (!Number.isFinite(montoAbonoNumerico) || montoAbonoNumerico <= 0) {
      toast.error("El monto del abono debe ser un numero mayor que cero.");
      return;
    }

    if (deudaSeleccionada.total <= 0.005) {
      toast.error(
        "Este prestamo no tiene deuda pendiente; no hace falta registrar abono.",
      );
      return;
    }

    let fechaPagoIso: string | undefined;
    if (pagoFecha.trim() !== "") {
      const fecha = new Date(`${pagoFecha}T12:00:00`);
      if (Number.isNaN(fecha.getTime())) {
        toast.error("La fecha del abono no es valida.");
        return;
      }
      fechaPagoIso = fecha.toISOString();
    }

    setIsPaying(true);

    try {
      const result = await loading.run(
        () =>
          createPrestamoPago(selectedPrestamo.id, {
            monto: montoAbonoNumerico,
            fechaPago: fechaPagoIso,
          }),
        { message: "Registrando abono..." },
      );

      setPrestamos((previous) =>
        previous.map((item) =>
          item.id === result.prestamo.id ? result.prestamo : item,
        ),
      );
      setPagosPrestamo((previous) => [result.pago, ...previous]);
      setPagoMonto("");
      setPagoFecha("");
      await feedback.alert({
        title: "Abono registrado",
        message: `Se registro un abono de ${formatMoney(montoAbonoNumerico)}.`,
        variant: "success",
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible registrar el abono"));
    } finally {
      setIsPaying(false);
    }
  };

  const handleDelete = async (prestamo: Prestamo) => {
    const isConfirmed = await feedback.confirm({
      title: "Eliminar prestamo",
      message: `Eliminar el prestamo de ${prestamo.socio.nombre} (${formatMoney(Number(prestamo.monto))})?\n\nSolo se permite si no tiene abonos y no esta activo o vencido.`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!isConfirmed) return;

    setDeletingPrestamoId(prestamo.id);

    try {
      await loading.run(() => deletePrestamo(prestamo.id), {
        message: "Eliminando prestamo...",
      });
      setPrestamos((previous) => previous.filter((item) => item.id !== prestamo.id));

      if (editingPrestamoId === prestamo.id) {
        closeForm();
      }
      if (selectedPrestamoId === prestamo.id) {
        closeAbono();
      }

      await feedback.alert({
        title: "Prestamo eliminado",
        message: "El prestamo fue eliminado del sistema.",
        variant: "success",
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible eliminar prestamo"));
    } finally {
      setDeletingPrestamoId(null);
    }
  };

  const isEditing = Boolean(editingPrestamoId);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Gestion</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Prestamos
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Capital, tasas mensuales e interes/mora por dias. Use{" "}
            <strong className="font-medium text-slate-800">Abonar</strong> para
            registrar pagos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
        >
          Nuevo prestamo
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Registros</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
            {filteredPrestamos.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Capital original</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
            {formatMoney(totalDesembolsado)}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:col-span-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Saldo capital pendiente
          </p>
          <p className="mt-1 text-xl font-semibold text-amber-700 sm:text-2xl">
            {formatMoney(totalSaldoPendiente)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label
            htmlFor="filtro-estado-prestamos"
            className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Filtrar por estado
          </label>
          <select
            id="filtro-estado-prestamos"
            value={filterEstado}
            onChange={(event) =>
              setFilterEstado(event.target.value as PrestamoEstado | "ALL")
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">Todos</option>
            {ESTADOS_PRESTAMO.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO_PRESTAMO[estado].titulo}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label
            htmlFor="filtro-socio-prestamos"
            className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Filtrar por socio
          </label>
          <SocioSearch
            id="filtro-socio-prestamos"
            socios={socios}
            value={filterSocioId === "ALL" ? null : filterSocioId}
            onChange={(socioId) => setFilterSocioId(socioId ?? "ALL")}
            allowClear
            clearLabel="Todos los socios"
            placeholder="Buscar socio..."
          />
        </div>
      </div>

      <PrestamoTable
        prestamos={filteredPrestamos}
        isLoading={isLoading}
        onEdit={handleEdit}
        onAbonar={handleSelectPrestamoForPayment}
        onDelete={handleDelete}
        deletingPrestamoId={deletingPrestamoId}
      />

      <Modal
        open={isFormOpen}
        onClose={closeForm}
        disableClose={isSubmitting}
        size="lg"
        title={isEditing ? "Editar prestamo" : "Registrar nuevo prestamo"}
        description={
          isEditing
            ? "Modifique condiciones o estado. Saldo en blanco conserva el valor actual."
            : "Complete capital y tasas. El saldo inicial se iguala al monto."
        }
      >
        <PrestamoForm
          data={formData}
          sociosActivos={sociosActivos}
          onFieldChange={(field, value) =>
            setFormData((previous) => ({ ...previous, [field]: value }))
          }
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          isEditing={isEditing}
        />
      </Modal>

      <Modal
        open={isAbonoOpen && Boolean(selectedPrestamo) && Boolean(deudaSeleccionada)}
        onClose={closeAbono}
        disableClose={isPaying}
        size="lg"
        title="Registrar abono"
        description="Revise la deuda, registre el pago y consulte el historial."
      >
        {selectedPrestamo && deudaSeleccionada ? (
          <AbonoPanel
            prestamo={selectedPrestamo}
            deuda={deudaSeleccionada}
            pagos={pagosPrestamo}
            isLoadingPagos={isLoadingPagos}
            pagoMonto={pagoMonto}
            pagoFecha={pagoFecha}
            onPagoMontoChange={setPagoMonto}
            onPagoFechaChange={setPagoFecha}
            onSubmit={handleRegistrarAbono}
            onCancel={closeAbono}
            isPaying={isPaying}
          />
        ) : null}
      </Modal>
    </div>
  );
}
