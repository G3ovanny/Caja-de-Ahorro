"use client";

import {
  createSocio,
  deleteSocio,
  getSocios,
  updateSocio,
  type Socio,
} from "@/src/lib/api/socios";
import { SocioForm, type SocioFormData } from "@/src/app/socios/components/SocioForm";
import { SocioTable } from "@/src/app/socios/components/SocioTable";
import { useFeedback } from "@/src/components/ui/FeedbackDialog";
import { useLoading } from "@/src/components/ui/Loading";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import { getErrorMessage } from "@/src/lib/errors";
import { filterSocios } from "@/src/lib/socios/search";
import { useEffect, useMemo, useState } from "react";

const initialFormData: SocioFormData = {
  nombre: "",
  tipoDocumento: "CEDULA",
  numeroDocumento: "",
  telefono: "",
  email: "",
  direccion: "",
  estado: "ACTIVO",
};

export default function SociosPage() {
  const toast = useToast();
  const feedback = useFeedback();
  const loading = useLoading();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [formData, setFormData] = useState<SocioFormData>(initialFormData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSocioId, setEditingSocioId] = useState<string | null>(null);
  const [deletingSocioId, setDeletingSocioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSocios = useMemo(
    () => filterSocios(socios, searchQuery),
    [socios, searchQuery],
  );

  const load = async () => {
    setIsLoading(true);

    try {
      const data = await loading.run(() => getSocios(), {
        message: "Cargando socios...",
      });
      setSocios(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible listar socios"));
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
    setEditingSocioId(null);
    setFormData(initialFormData);
  };

  const openCreateForm = () => {
    setEditingSocioId(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        tipoDocumento: formData.tipoDocumento,
        numeroDocumento: formData.numeroDocumento.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim(),
        direccion: formData.direccion.trim(),
        estado: formData.estado,
      };

      if (editingSocioId) {
        const updatedSocio = await loading.run(
          () => updateSocio(editingSocioId, payload),
          { message: "Guardando socio..." },
        );
        setSocios((previous) =>
          previous.map((socio) =>
            socio.id === updatedSocio.id ? updatedSocio : socio,
          ),
        );
        setIsFormOpen(false);
        setEditingSocioId(null);
        setFormData(initialFormData);
        await feedback.alert({
          title: "Socio actualizado",
          message: `Los datos de "${updatedSocio.nombre}" se guardaron correctamente.`,
          variant: "success",
        });
      } else {
        const createdSocio = await loading.run(() => createSocio(payload), {
          message: "Registrando socio...",
        });
        setSocios((previous) => [createdSocio, ...previous]);
        setIsFormOpen(false);
        setEditingSocioId(null);
        setFormData(initialFormData);
        await feedback.alert({
          title: "Socio registrado",
          message: `"${createdSocio.nombre}" fue agregado al padron.`,
          variant: "success",
        });
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingSocioId
            ? "No fue posible actualizar socio"
            : "No fue posible crear socio",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (socio: Socio) => {
    setEditingSocioId(socio.id);
    setFormData({
      nombre: socio.nombre,
      tipoDocumento: socio.tipoDocumento,
      numeroDocumento: socio.numeroDocumento,
      telefono: socio.telefono,
      email: socio.email ?? "",
      direccion: socio.direccion ?? "",
      estado: socio.estado,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (socio: Socio) => {
    const isConfirmed = await feedback.confirm({
      title: "Eliminar socio",
      message: `Estas seguro de eliminar al socio "${socio.nombre}"? Esta accion no se puede deshacer.`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!isConfirmed) return;

    setDeletingSocioId(socio.id);

    try {
      await loading.run(() => deleteSocio(socio.id), {
        message: "Eliminando socio...",
      });
      setSocios((previous) => previous.filter((item) => item.id !== socio.id));

      if (editingSocioId === socio.id) {
        closeForm();
      }

      await feedback.alert({
        title: "Socio eliminado",
        message: `"${socio.nombre}" fue eliminado del padron.`,
        variant: "success",
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible eliminar socio"));
    } finally {
      setDeletingSocioId(null);
    }
  };

  const isEditing = Boolean(editingSocioId);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Gestion</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Socios
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
        >
          Nuevo socio
        </button>
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="buscar-socios"
          className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          Buscar socios
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="buscar-socios"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Nombre, documento, telefono o correo..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              Limpiar
            </button>
          ) : null}
        </div>
        {searchQuery.trim() ? (
          <p className="mt-2 text-xs text-slate-500">
            {filteredSocios.length} de {socios.length} socios
          </p>
        ) : null}
      </div>

      <SocioTable
        socios={filteredSocios}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        deletingSocioId={deletingSocioId}
      />

      <Modal
        open={isFormOpen}
        onClose={closeForm}
        disableClose={isSubmitting}
        title={isEditing ? "Editar socio" : "Registrar nuevo socio"}
        description="Los datos de documento identifican al socio de forma unica. El telefono es obligatorio para contacto operativo."
      >
        <SocioForm
          data={formData}
          onFieldChange={(field, value) =>
            setFormData((previous) => ({ ...previous, [field]: value }))
          }
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSubmitting={isSubmitting}
          isEditing={isEditing}
        />
      </Modal>
    </div>
  );
}
