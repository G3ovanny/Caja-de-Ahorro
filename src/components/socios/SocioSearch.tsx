"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import type { Socio } from "@/src/lib/api/socios";
import {
  filterSocios,
  formatSocioLabel,
} from "@/src/lib/socios/search";

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export interface SocioSearchProps {
  id?: string;
  socios: Socio[];
  /** Selected socio id, or null when none / "all". */
  value: string | null;
  onChange: (socioId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show a clear option (filters: "Todos los socios"). */
  allowClear?: boolean;
  clearLabel?: string;
  /** Limit options to ACTIVO socios. */
  onlyActivos?: boolean;
  emptyMessage?: string;
  className?: string;
}

function estadoTone(estado: Socio["estado"]): string {
  if (estado === "ACTIVO") return "bg-emerald-100 text-emerald-700";
  if (estado === "SUSPENDIDO") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function SocioSearch({
  id,
  socios,
  value,
  onChange,
  placeholder = "Buscar por nombre, documento o telefono...",
  disabled = false,
  allowClear = false,
  clearLabel = "Todos los socios",
  onlyActivos = false,
  emptyMessage = "No se encontraron socios",
  className = "",
}: SocioSearchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  const optionsBase = useMemo(() => {
    const list = onlyActivos
      ? socios.filter((socio) => socio.estado === "ACTIVO")
      : socios;
    return list;
  }, [socios, onlyActivos]);

  const selectedSocio = useMemo(
    () => optionsBase.find((socio) => socio.id === value) ?? socios.find((s) => s.id === value) ?? null,
    [optionsBase, socios, value],
  );

  const filtered = useMemo(
    () => filterSocios(optionsBase, query),
    [optionsBase, query],
  );

  const itemCount = filtered.length + (allowClear ? 1 : 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setIsOpen(false);
      setQuery("");
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = rootRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const preferred = 280;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        140,
        Math.min(preferred, openUp ? spaceAbove : spaceBelow),
      );

      setPosition({
        top: openUp ? rect.top - maxHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight,
        openUp,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, filtered.length, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-index="${highlightedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen]);

  const openDropdown = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery("");
  };

  const selectSocio = (socioId: string | null) => {
    onChange(socioId);
    closeDropdown();
    inputRef.current?.blur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }
      setHighlightedIndex((index) => (index + 1) % Math.max(itemCount, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }
      setHighlightedIndex((index) =>
        (index - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1),
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }

      if (allowClear && highlightedIndex === 0) {
        selectSocio(null);
        return;
      }

      const socioIndex = allowClear ? highlightedIndex - 1 : highlightedIndex;
      const socio = filtered[socioIndex];
      if (socio) selectSocio(socio.id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      return;
    }

    if (event.key === "Tab") {
      closeDropdown();
    }
  };

  const displayValue = isOpen
    ? query
    : selectedSocio
      ? formatSocioLabel(selectedSocio)
      : allowClear && value === null
        ? clearLabel
        : "";

  const dropdown =
    mounted && isOpen && position
      ? createPortal(
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Resultados de socios"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              zIndex: 80,
            }}
            className="overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {allowClear ? (
              <li role="option" aria-selected={value === null}>
                <button
                  type="button"
                  data-index={0}
                  className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition ${
                    highlightedIndex === 0
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => setHighlightedIndex(0)}
                  onClick={() => selectSocio(null)}
                >
                  <span className="font-medium">{clearLabel}</span>
                </button>
              </li>
            ) : null}

            {filtered.map((socio, index) => {
              const optionIndex = allowClear ? index + 1 : index;
              const isHighlighted = highlightedIndex === optionIndex;
              const isSelected = value === socio.id;

              return (
                <li
                  key={socio.id}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    data-index={optionIndex}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                      isHighlighted
                        ? "bg-blue-50 text-slate-900"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                    onMouseEnter={() => setHighlightedIndex(optionIndex)}
                    onClick={() => selectSocio(socio.id)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {socio.nombre}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {socio.tipoDocumento} {socio.numeroDocumento}
                        {socio.telefono ? ` · ${socio.telefono}` : ""}
                      </span>
                    </span>
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${estadoTone(socio.estado)}`}
                    >
                      {socio.estado}
                    </span>
                  </button>
                </li>
              );
            })}

            {!filtered.length ? (
              <li className="px-3 py-4 text-center text-sm text-slate-500">
                {optionsBase.length === 0
                  ? onlyActivos
                    ? "No hay socios activos"
                    : "No hay socios cargados"
                  : emptyMessage}
              </li>
            ) : null}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen ? `${listboxId}-opt-${highlightedIndex}` : undefined
          }
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          autoComplete="off"
          onFocus={openDropdown}
          onClick={openDropdown}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-3 pr-20 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {value && !disabled ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Quitar socio seleccionado"
              className="pointer-events-auto rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                selectSocio(null);
                inputRef.current?.focus();
              }}
            >
              Limpiar
            </button>
          ) : null}
          <span className="text-slate-400" aria-hidden>
            ▾
          </span>
        </div>
      </div>

      {dropdown}
    </div>
  );
}
