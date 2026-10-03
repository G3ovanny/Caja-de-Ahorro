"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createAhorro,
  deleteAhorro,
  getAhorros,
  updateAhorro,
  type Ahorro,
} from "@/src/lib/api/ahorros";
import {
  createRetiro,
  getRetiros,
  type Retiro,
} from "@/src/lib/api/retiros";
import { getSocios, type Socio } from "@/src/lib/api/socios";
import { useFeedback } from "@/src/components/ui/FeedbackDialog";
import { useLoading } from "@/src/components/ui/Loading";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import { SocioSearch } from "@/src/components/socios/SocioSearch";
import {
  AhorroForm,
  type AhorroFormData,
} from "@/src/app/ahorros/components/AhorroForm";
import {
  RetiroForm,
  type RetiroFormData,
} from "@/src/app/ahorros/components/RetiroForm";
import { AhorroTable } from "@/src/app/ahorros/components/AhorroTable";
import { RetiroTable } from "@/src/app/ahorros/components/RetiroTable";
import { getErrorMessage } from "@/src/lib/errors";

const initialAhorroFormData: AhorroFormData = {
  socioId: "",
  monto: "",
  fecha: "",
};

const initialRetiroFormData: RetiroFormData = {
  socioId: "",
  monto: "",
  fecha: "",
  descripcion: "",
};

export default function AhorrosPage() {
  const toast = useToast();
  const feedback = useFeedback();
  const loading = useLoading();
  const [ahorros, setAhorros] = useState<Ahorro[]>([]);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [ahorroFormData, setAhorroFormData] =
    useState<AhorroFormData>(initialAhorroFormData);
  const [retiroFormData, setRetiroFormData] =
    useState<RetiroFormData>(initialRetiroFormData);
  const [isAporteModalOpen, setIsAporteModalOpen] = useState(false);
  const [isRetiroModalOpen, setIsRetiroModalOpen] = useState(false);
  const [editingAhorroId, setEditingAhorroId] = useState<string | null>(null);
  const [deletingAhorroId, setDeletingAhorroId] = useState<string | null>(null);
  const [filterSocioId, setFilterSocioId] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAporte, setIsSubmittingAporte] = useState(false);
  const [isSubmittingRetiro, setIsSubmittingRetiro] = useState(false);

  const sociosActivos = useMemo(
    () => socios.filter((socio) => socio.estado === "ACTIVO"),
    [socios],
  );

  const defaultSocioId = sociosActivos[0]?.id ?? "";

  const filteredAhorros = useMemo(() => {
    if (filterSocioId === "ALL") return ahorros;
    return ahorros.filter((ahorro) => ahorro.socioId === filterSocioId);
  }, [ahorros, filterSocioId]);

  const filteredRetiros = useMemo(() => {
    if (filterSocioId === "ALL") return retiros;
    return retiros.filter((retiro) => retiro.socioId === filterSocioId);
  }, [retiros, filterSocioId]);

  const totalAportado = useMemo(
    () =>
      filteredAhorros.reduce(
        (accumulator, ahorro) => accumulator + Number(ahorro.monto),
        0,
      ),
    [filteredAhorros],
  );

  const totalRetirado = useMemo(
    () =>
      filteredRetiros.reduce(
        (accumulator, retiro) => accumulator + Number(retiro.monto),
        0,
      ),
    [filteredRetiros],
  );

  const saldoDisponible = useMemo(
    () => Math.max(0, totalAportado - totalRetirado),
    [totalAportado, totalRetirado],
  );

  const disponibleSocioRetiro = useMemo(() => {
    if (!retiroFormData.socioId) return 0;

    const aportado = ahorros
      .filter((ahorro) => ahorro.socioId === retiroFormData.socioId)
      .reduce((sum, ahorro) => sum + Number(ahorro.monto), 0);

    const retirado = retiros
      .filter((retiro) => retiro.socioId === retiroFormData.socioId)
      .reduce((sum, retiro) => sum + Number(retiro.monto), 0);

    return Math.max(0, aportado - retirado);
  }, [ahorros, retiros, retiroFormData.socioId]);

  const load = async () => {
    setIsLoading(true);

    try {
      const [ahorrosData, retirosData, sociosData] = await loading.run(
        () => Promise.all([getAhorros(), getRetiros(), getSocios()]),
        { message: "Cargando ahorros..." },
      );
      setAhorros(ahorrosData);
      setRetiros(retirosData);
      setSocios(sociosData);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No fue posible cargar el modulo de ahorros"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const closeAporteModal = () => {
    if (isSubmittingAporte) return;
    setIsAporteModalOpen(false);
    setEditingAhorroId(null);
    setAhorroFormData(initialAhorroFormData);
  };

  const closeRetiroModal = () => {
    if (isSubmittingRetiro) return;
    setIsRetiroModalOpen(false);
    setRetiroFormData(initialRetiroFormData);
  };

  const openCreateAporte = () => {
    setEditingAhorroId(null);
    setAhorroFormData({
      ...initialAhorroFormData,
      socioId: defaultSocioId,
    });
    setIsAporteModalOpen(true);
  };

  const openCreateRetiro = () => {
    setRetiroFormData({
      ...initialRetiroFormData,
      socioId: defaultSocioId,
    });
    setIsRetiroModalOpen(true);
  };

  const handleSubmitAporte = async () => {
    if (!ahorroFormData.socioId || !ahorroFormData.monto.trim()) return;

    setIsSubmittingAporte(true);

    try {
      const payload = {
        socioId: ahorroFormData.socioId,
        monto: Number(ahorroFormData.monto),
        fecha: ahorroFormData.fecha || undefined,
      };

      if (editingAhorroId) {
        const updatedAhorro = await loading.run(
          () => updateAhorro(editingAhorroId, payload),
          { message: "Guardando aporte..." },
        );
        setAhorros((previous) =>
          previous.map((item) =>
            item.id === updatedAhorro.id ? updatedAhorro : item,
          ),
        );
        setIsAporteModalOpen(false);
        setEditingAhorroId(null);
        setAhorroFormData(initialAhorroFormData);
        await feedback.alert({
          title: "Aporte actualizado",
          message: "El registro de ahorro se guardo correctamente.",
          variant: "success",
        });
      } else {
        const createdAhorro = await loading.run(() => createAhorro(payload), {
          message: "Registrando aporte...",
        });
        setAhorros((previous) => [createdAhorro, ...previous]);
        setIsAporteModalOpen(false);
        setEditingAhorroId(null);
        setAhorroFormData(initialAhorroFormData);
        await feedback.alert({
          title: "Aporte registrado",
          message: "El nuevo aporte se registro correctamente.",
          variant: "success",
        });
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingAhorroId
            ? "No fue posible actualizar ahorro"
            : "No fue posible registrar ahorro",
        ),
      );
    } finally {
      setIsSubmittingAporte(false);
    }
  };

  const handleSubmitRetiro = async () => {
    if (!retiroFormData.socioId || !retiroFormData.monto.trim()) return;

    setIsSubmittingRetiro(true);

    try {
      const createdRetiro = await loading.run(
        () =>
          createRetiro({
            socioId: retiroFormData.socioId,
            monto: Number(retiroFormData.monto),
            fecha: retiroFormData.fecha || undefined,
            descripcion: retiroFormData.descripcion.trim() || undefined,
          }),
        { message: "Registrando retiro..." },
      );

      setRetiros((previous) => [createdRetiro, ...previous]);
      setIsRetiroModalOpen(false);
      setRetiroFormData(initialRetiroFormData);
      await feedback.alert({
        title: "Retiro registrado",
        message: "El retiro se desconto del disponible del socio.",
        variant: "success",
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible registrar retiro"));
    } finally {
      setIsSubmittingRetiro(false);
    }
  };

  const handleEdit = (ahorro: Ahorro) => {
    setEditingAhorroId(ahorro.id);
    setAhorroFormData({
      socioId: ahorro.socioId,
      monto: Number(ahorro.monto).toFixed(2),
      fecha: new Date(ahorro.fecha).toISOString().slice(0, 10),
    });
    setIsAporteModalOpen(true);
  };

  const handleDelete = async (ahorro: Ahorro) => {
    const isConfirmed = await feedback.confirm({
      title: "Eliminar aporte",
      message: `Estas seguro de eliminar el ahorro de ${ahorro.socio.nombre} por $${Number(
        ahorro.monto,
      ).toFixed(2)}?`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!isConfirmed) return;

    setDeletingAhorroId(ahorro.id);

    try {
      await loading.run(() => deleteAhorro(ahorro.id), {
        message: "Eliminando aporte...",
      });
      setAhorros((previous) => previous.filter((item) => item.id !== ahorro.id));

      if (editingAhorroId === ahorro.id) {
        closeAporteModal();
      }

      await feedback.alert({
        title: "Aporte eliminado",
        message: "El registro de ahorro fue eliminado.",
        variant: "success",
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible eliminar ahorro"));
    } finally {
      setDeletingAhorroId(null);
    }
  };

  const isEditingAporte = Boolean(editingAhorroId);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Gestion</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Ahorros
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Registra aportes y retiros. El saldo disponible es aportes menos
            retiros del filtro actual.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={openCreateAporte}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
          >
            Nuevo aporte
          </button>
          <button
            type="button"
            onClick={openCreateRetiro}
            className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 sm:w-auto"
          >
            Nuevo retiro
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Aportes</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
            {filteredAhorros.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total aportado</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700 sm:text-2xl">
            ${totalAportado.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total retirado</p>
          <p className="mt-1 text-xl font-semibold text-amber-700 sm:text-2xl">
            ${totalRetirado.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Saldo disponible</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
            ${saldoDisponible.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:max-w-md">
        <label
          htmlFor="filtro-socio-ahorros"
          className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          Filtrar por socio
        </label>
        <SocioSearch
          id="filtro-socio-ahorros"
          socios={socios}
          value={filterSocioId === "ALL" ? null : filterSocioId}
          onChange={(socioId) => setFilterSocioId(socioId ?? "ALL")}
          allowClear
          clearLabel="Todos los socios"
          placeholder="Buscar socio..."
        />
      </div>

      <AhorroTable
        ahorros={filteredAhorros}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        deletingAhorroId={deletingAhorroId}
      />

      <RetiroTable retiros={filteredRetiros} isLoading={isLoading} />

      <Modal
        open={isAporteModalOpen}
        onClose={closeAporteModal}
        disableClose={isSubmittingAporte}
        title={isEditingAporte ? "Editar aporte" : "Registrar nuevo aporte"}
        description={
          isEditingAporte
            ? "Ajuste monto o fecha del registro seleccionado."
            : "Seleccione socio, monto y opcionalmente la fecha del aporte."
        }
      >
        <AhorroForm
          data={ahorroFormData}
          sociosActivos={sociosActivos}
          onFieldChange={(field, value) =>
            setAhorroFormData((previous) => ({ ...previous, [field]: value }))
          }
          onSubmit={handleSubmitAporte}
          onCancel={closeAporteModal}
          isSubmitting={isSubmittingAporte}
          isEditing={isEditingAporte}
        />
      </Modal>

      <Modal
        open={isRetiroModalOpen}
        onClose={closeRetiroModal}
        disableClose={isSubmittingRetiro}
        title="Registrar retiro"
        description="El retiro descuenta del disponible del socio (aportes menos retiros)."
      >
        <RetiroForm
          data={retiroFormData}
          sociosActivos={sociosActivos}
          disponibleSocio={disponibleSocioRetiro}
          onFieldChange={(field, value) =>
            setRetiroFormData((previous) => ({ ...previous, [field]: value }))
          }
          onSubmit={handleSubmitRetiro}
          onCancel={closeRetiroModal}
          isSubmitting={isSubmittingRetiro}
        />
      </Modal>
    </div>
  );
}
