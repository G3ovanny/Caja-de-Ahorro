import ExcelJS from "exceljs";
import { prisma } from "@/src/lib/prisma";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  SUSPENDIDO: "Suspendido",
  RETIRADO: "Retirado",
};

type MatrizParams = {
  socioId?: string;
  desde?: Date;
  hasta?: Date;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function paintHeader(row: ExcelJS.Row, cols: number) {
  for (let c = 1; c <= cols; c += 1) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  }
  row.height = 24;
}

function borderRow(row: ExcelJS.Row, cols: number) {
  for (let c = 1; c <= cols; c += 1) {
    row.getCell(c).border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  }
}

/**
 * Un solo Excel:
 * - Filas: socios
 * - Columnas: Enero … Diciembre + Total
 * - Una hoja por año
 * Valor = suma de registros de ahorro (aportes/rendimientos) del socio en ese mes.
 */
export async function buildMatrizAhorrosMensualExcel(
  params: MatrizParams = {},
): Promise<{ buffer: Buffer; filename: string }> {
  const { socioId, desde, hasta } = params;

  const socios = await prisma.socio.findMany({
    where: socioId ? { id: socioId } : undefined,
    select: {
      id: true,
      nombre: true,
      numeroDocumento: true,
      tipoDocumento: true,
      estado: true,
    },
    orderBy: { nombre: "asc" },
  });

  if (socioId && socios.length === 0) {
    throw Object.assign(new Error("Socio no encontrado"), { status: 404 });
  }

  const socioIds = socios.map((s) => s.id);

  const ahorros =
    socioIds.length === 0
      ? []
      : await prisma.ahorro.findMany({
          where: {
            socioId: { in: socioIds },
            ...(desde || hasta
              ? {
                  fecha: {
                    ...(desde ? { gte: desde } : {}),
                    ...(hasta ? { lte: hasta } : {}),
                  },
                }
              : {}),
          },
          select: {
            socioId: true,
            monto: true,
            fecha: true,
          },
        });

  // socioId -> year -> month(1-12) -> sum
  const matrix = new Map<string, Map<number, number[]>>();
  const years = new Set<number>();

  for (const socio of socios) {
    matrix.set(
      socio.id,
      new Map(),
    );
  }

  for (const ahorro of ahorros) {
    const fecha = ahorro.fecha;
    const year = fecha.getFullYear();
    const month = fecha.getMonth() + 1; // 1-12
    years.add(year);

    let byYear = matrix.get(ahorro.socioId);
    if (!byYear) {
      byYear = new Map();
      matrix.set(ahorro.socioId, byYear);
    }

    let months = byYear.get(year);
    if (!months) {
      months = Array.from({ length: 12 }, () => 0);
      byYear.set(year, months);
    }

    months[month - 1] = round2(months[month - 1] + Number(ahorro.monto));
  }

  // Si no hay ahorros, igual generar hoja del año actual
  if (years.size === 0) {
    years.add(new Date().getFullYear());
  }

  const yearList = [...years].sort((a, b) => a - b);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Caja de Ahorro App";
  workbook.created = new Date();

  for (const year of yearList) {
    const sheet = workbook.addWorksheet(String(year), {
      views: [{ state: "frozen", xSplit: 4, ySplit: 4 }],
    });

    sheet.mergeCells("A1:P1");
    sheet.getCell("A1").value = "Caja de Ahorro App";
    sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF0F172A" } };

    sheet.mergeCells("A2:P2");
    sheet.getCell("A2").value = `Ahorros mensualizados — Año ${year}`;
    sheet.getCell("A2").font = { bold: true, size: 12, color: { argb: "FF1D4ED8" } };

    sheet.mergeCells("A3:P3");
    sheet.getCell("A3").value =
      "Cada celda es la suma de ahorros (aportes/rendimientos) del socio en ese mes.";
    sheet.getCell("A3").font = { size: 9, color: { argb: "FF64748B" } };

    const header = sheet.addRow([
      "N°",
      "Socio",
      "Documento",
      "Estado",
      ...MESES,
      "Total anual",
    ]);
    paintHeader(header, 17);

    const totalsMes = Array.from({ length: 12 }, () => 0);
    let totalGeneral = 0;

    socios.forEach((socio, index) => {
      const months = matrix.get(socio.id)?.get(year) ?? Array.from({ length: 12 }, () => 0);
      const totalSocio = round2(months.reduce((sum, v) => sum + v, 0));
      totalGeneral = round2(totalGeneral + totalSocio);

      months.forEach((v, i) => {
        totalsMes[i] = round2(totalsMes[i] + v);
      });

      const row = sheet.addRow([
        index + 1,
        socio.nombre,
        `${socio.tipoDocumento} ${socio.numeroDocumento}`,
        ESTADO_LABEL[socio.estado] ?? socio.estado,
        ...months.map((v) => (v === 0 ? null : v)),
        totalSocio === 0 ? null : totalSocio,
      ]);

      for (let c = 5; c <= 17; c += 1) {
        row.getCell(c).numFmt = '"$"#,##0.00';
        row.getCell(c).alignment = { horizontal: "right" };
      }
      row.getCell(17).font = { bold: true };
      borderRow(row, 17);

      if (index % 2 === 1) {
        for (let c = 1; c <= 17; c += 1) {
          if (!row.getCell(c).fill || row.getCell(c).fill?.type !== "pattern") {
            row.getCell(c).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
          }
        }
      }
    });

    const totalRow = sheet.addRow([
      "",
      "TOTAL",
      "",
      "",
      ...totalsMes.map((v) => (v === 0 ? null : v)),
      totalGeneral === 0 ? null : totalGeneral,
    ]);
    totalRow.font = { bold: true };
    for (let c = 1; c <= 17; c += 1) {
      totalRow.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" },
      };
    }
    for (let c = 5; c <= 17; c += 1) {
      totalRow.getCell(c).numFmt = '"$"#,##0.00';
    }
    borderRow(totalRow, 17);

    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 28;
    sheet.getColumn(3).width = 20;
    sheet.getColumn(4).width = 12;
    for (let c = 5; c <= 17; c += 1) {
      sheet.getColumn(c).width = 11;
    }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const filename = socioId
    ? `ahorros-mensualizados-${socios[0]?.numeroDocumento ?? "socio"}.xlsx`
    : `ahorros-mensualizados-todos.xlsx`;

  return { buffer, filename };
}

/** Compat: API antigua */
export async function buildEstadosCuentaExcelBuffer(): Promise<Buffer> {
  const { buffer } = await buildMatrizAhorrosMensualExcel();
  return buffer;
}

export function excelFilename(): string {
  return `ahorros-mensualizados-todos.xlsx`;
}
