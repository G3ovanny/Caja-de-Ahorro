export type NavItem = {
  href: string;
  label: string;
  description: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operaciones",
    items: [
      {
        href: "/socios",
        label: "Socios",
        description: "Padron y datos de afiliados",
      },
      {
        href: "/ahorros",
        label: "Ahorros",
        description: "Aportes y retiros",
      },
      {
        href: "/prestamos",
        label: "Prestamos",
        description: "Creditos y abonos",
      },
      {
        href: "/movimientos",
        label: "Movimientos",
        description: "Historial de operaciones",
      },
    ],
  },
  {
    title: "Control",
    items: [
      {
        href: "/cierres-interes",
        label: "Cierres",
        description: "Cierre de intereses",
      },
      {
        href: "/estados-cuenta",
        label: "Estados de cuenta",
        description: "Consultas e impresion",
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        href: "/configuracion",
        label: "Configuracion",
        description: "Parametros y reportes",
      },
      {
        href: "/configuracion/usuarios",
        label: "Usuarios",
        description: "Cuentas y roles de acceso",
      },
    ],
  },
];

export function getActiveNavLabel(pathname: string): string {
  let bestLabel = "Panel";
  let bestLength = -1;

  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const matches =
        pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && item.href.length > bestLength) {
        bestLabel = item.label;
        bestLength = item.href.length;
      }
    }
  }

  return bestLabel;
}
