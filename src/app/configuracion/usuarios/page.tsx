"use client";

import { FieldGroup } from "@/src/components/forms/FieldGroup";
import { useFeedback } from "@/src/components/ui/FeedbackDialog";
import { useLoading } from "@/src/components/ui/Loading";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import {
  createUsuario,
  deleteUsuario,
  getUsuarios,
  updateUsuario,
  type Usuario,
} from "@/src/lib/api/usuarios";
import { ROL_LABELS, type RolUsuario } from "@/src/lib/auth/constants";
import { getErrorMessage } from "@/src/lib/errors";
import { useEffect, useMemo, useState } from "react";

type UsuarioFormData = {
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
  estado: "ACTIVO" | "INACTIVO";
  debeCambiarPassword: boolean;
};

const initialForm: UsuarioFormData = {
  nombre: "",
  email: "",
  password: "",
  rol: "OPERADOR",
  estado: "ACTIVO",
  debeCambiarPassword: true,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function UsuariosPage() {
  const toast = useToast();
  const feedback = useFeedback();
  const loading = useLoading();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [formData, setFormData] = useState<UsuarioFormData>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ROL_LABELS[u.rol].toLowerCase().includes(q),
    );
  }, [usuarios, searchQuery]);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await loading.run(() => getUsuarios(), {
        message: "Cargando usuarios...",
      });
      setUsuarios(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible listar usuarios"));
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
    setEditingId(null);
    setFormData(initialForm);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsFormOpen(true);
  };

  const openEdit = (usuario: Usuario) => {
    setEditingId(usuario.id);
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      password: "",
      rol: usuario.rol,
      estado: usuario.estado,
      debeCambiarPassword: usuario.debeCambiarPassword,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim() || !formData.email.trim()) return;
    if (!editingId && !formData.password) {
      toast.error("La contrasena temporal es requerida");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const payload = {
          nombre: formData.nombre.trim(),
          email: formData.email.trim().toLowerCase(),
          rol: formData.rol,
          estado: formData.estado,
          debeCambiarPassword: formData.debeCambiarPassword,
          ...(formData.password ? { password: formData.password } : {}),
        };
        const updated = await loading.run(
          () => updateUsuario(editingId, payload),
          { message: "Guardando usuario..." },
        );
        setUsuarios((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u)),
        );
        closeForm();
        await feedback.alert({
          title: "Usuario actualizado",
          message: `Los datos de "${updated.nombre}" se guardaron correctamente.`,
          variant: "success",
        });
      } else {
        const created = await loading.run(
          () =>
            createUsuario({
              nombre: formData.nombre.trim(),
              email: formData.email.trim().toLowerCase(),
              password: formData.password,
              rol: formData.rol,
              estado: formData.estado,
            }),
          { message: "Creando usuario..." },
        );
        setUsuarios((prev) => [created, ...prev]);
        closeForm();
        await feedback.alert({
          title: "Usuario creado",
          message: `"${created.nombre}" ya puede iniciar sesion. Debera cambiar la contrasena en el primer acceso.`,
          variant: "success",
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible guardar el usuario"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (usuario: Usuario) => {
    const confirmed = await feedback.confirm({
      title: "Desactivar usuario",
      message: `¿Desactivar a "${usuario.nombre}"? Perdera el acceso de inmediato.`,
      confirmLabel: "Desactivar",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await loading.run(() => deleteUsuario(usuario.id), {
        message: "Desactivando usuario...",
      });
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuario.id ? { ...u, estado: "INACTIVO" } : u,
        ),
      );
      toast.success("Usuario desactivado");
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible desactivar el usuario"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Sistema</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Usuarios y roles
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestione el personal con acceso al sistema. Solo administradores.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Nuevo usuario
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, correo o rol..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Ultimo acceso</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              ) : (
                filtered.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {usuario.nombre}
                      {usuario.debeCambiarPassword ? (
                        <span className="mt-1 block text-xs font-normal text-amber-700">
                          Debe cambiar contrasena
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {ROL_LABELS[usuario.rol]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          usuario.estado === "ACTIVO"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {usuario.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(usuario.ultimoAccesoAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(usuario)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                        >
                          Editar
                        </button>
                        {usuario.estado === "ACTIVO" ? (
                          <button
                            type="button"
                            onClick={() => void handleDeactivate(usuario)}
                            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                          >
                            Desactivar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isFormOpen}
        onClose={closeForm}
        title={editingId ? "Editar usuario" : "Nuevo usuario"}
      >
        <div className="space-y-4">
          <FieldGroup id="nombre" label="Nombre">
            <input
              id="nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nombre: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </FieldGroup>

          <FieldGroup id="email" label="Correo">
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </FieldGroup>

          <FieldGroup
            id="password"
            label={editingId ? "Nueva contrasena (opcional)" : "Contrasena temporal"}
            hint="Minimo 8 caracteres, con mayuscula, minuscula y numero."
          >
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </FieldGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup id="rol" label="Rol">
              <select
                id="rol"
                value={formData.rol}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    rol: e.target.value as RolUsuario,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="ADMIN">Administrador</option>
                <option value="OPERADOR">Operador</option>
                <option value="SOLO_LECTURA">Solo lectura</option>
              </select>
            </FieldGroup>

            <FieldGroup id="estado" label="Estado">
              <select
                id="estado"
                value={formData.estado}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    estado: e.target.value as "ACTIVO" | "INACTIVO",
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </FieldGroup>
          </div>

          {editingId ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formData.debeCambiarPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    debeCambiarPassword: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Exigir cambio de contrasena en el proximo acceso
            </label>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeForm}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
