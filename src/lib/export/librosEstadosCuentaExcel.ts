import ExcelJS from "exceljs";
import JSZip from "jszip";
import type {
  EstadoCuentaItem,
  EstadoCuentaMovimiento,
  EstadosCuentaReporte,
} from "@/src/lib/api/estados-cuenta";
import { generarEstadosCuentaReporte } from "@/src/lib/reports/estadosCuenta";

const BRAND = "Caja de Ahorro App";

const AHORRO_TIPOS = new Set([
  "APORTE",
  "RETIRO",
  "AJUSTE",
  "RENDIMIENTO_AHORRO",
]);

const TIPO_LABEL: Record<string, string> = {
  APORTE: "Aporte",
  RETIRO: "Retiro",
  DESEMBOLSO_PRESTAMO: "Desembolso de prestamo",
  PAGO_PRESTAMO: "Pago de prestamo",
  AJUSTE: "Ajuste",
  RENDIMIENTO_AHORRO: "Rendimiento de ahorro",
};

const ESTADO_SOCIO: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  SUSPENDIDO: "Suspendido",
  RETIRADO: "Retirado",
};

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
];

const COLORS = {
  headerBg: "FF0F172A",
  headerFg: "FFFFFFFF",
  accentBg: "FF1D4ED8",
  monthBg: "FFE2E8F0",
  totalBg: "FFFEF3C7",
  socioBg: "FFEFF6FF",
  border: "FFCBD5E1",
  moneyIn: "FF047857",
  moneyOut: "FFB91C1C",
};

function n(value: string | number): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const f = formatFecha(iso);
  const h = formatHora(iso);
  return h ? `${f} ${h}` : f;
}

function periodoTexto(periodo: EstadosCuentaReporte["periodo"]): string {
  if (!periodo.desde && !periodo.hasta) return "Todo el historial";
  const desde = periodo.desde ? formatFechaHora(periodo.desde) : "Inicio";
  const hasta = periodo.hasta ? formatFechaHora(periodo.hasta) : "Actual";
  return `${desde}  a  ${hasta}`;
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MESES[(m ?? 1) - 1]} ${y}`;
}

function sheetName(base: string, used: Set<string>): string {
  let name = base
    .replace(/[\\/*?:\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  if (!name) name = "Socio";
  let candidate = name;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = `${name.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function applyMoney(cell: ExcelJS.Cell) {
  cell.numFmt = '"$"#,##0.00';
}

function paintHeader(row: ExcelJS.Row, cols: number) {
  for (let c = 1; c <= cols; c += 1) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.headerFg }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.headerBg },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
  }
  row.height = 22;
}

function thinBorder(row: ExcelJS.Row, cols: number) {
  for (let c = 1; c <= cols; c += 1) {
    row.getCell(c).border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
    };
  }
}

function writeTitleBlock(
  sheet: ExcelJS.Worksheet,
  title: string,
  reporte: EstadosCuentaReporte,
  subtitle?: string,
) {
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = BRAND;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: COLORS.headerBg } };

  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = title;
  sheet.getCell("A2").font = { bold: true, size: 13, color: { argb: COLORS.accentBg } };

  if (subtitle) {
    sheet.mergeCells("A3:H3");
    sheet.getCell("A3").value = subtitle;
    sheet.getCell("A3").font = { size: 10, color: { argb: "FF475569" } };
  }

  sheet.mergeCells("A4:H4");
  sheet.getCell("A4").value = `Periodo: ${periodoTexto(reporte.periodo)}`;
  sheet.getCell("A4").font = { size: 10 };

  sheet.mergeCells("A5:H5");
  sheet.getCell("A5").value = `Generado: ${formatFechaHora(reporte.generadoEn)}`;
  sheet.getCell("A5").font = { size: 10, color: { argb: "FF64748B" } };

  sheet.addRow([]);
}

function isIngresoAhorro(tipo: string): boolean {
  return tipo !== "RETIRO";
}

function movimientosAhorro(estado: EstadoCuentaItem): EstadoCuentaMovimiento[] {
  return estado.movimientos.filter((m) => AHORRO_TIPOS.has(m.tipo));
}

function groupByMonth(movimientos: EstadoCuentaMovimiento[]) {
  const map = new Map<string, EstadoCuentaMovimiento[]>();
  for (const mov of movimientos) {
    const key = monthKey(mov.createdAt);
    const list = map.get(key) ?? [];
    list.push(mov);
    map.set(key, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

async function buildLibroResumen(reporte: EstadosCuentaReporte): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  wb.created = new Date(reporte.generadoEn);

  const sheet = wb.addWorksheet("Resumen general", {
    views: [{ showGridLines: false }],
  });
  writeTitleBlock(
    sheet,
    "Resumen general de estados de cuenta",
    reporte,
    reporte.ambito === "TODOS"
      ? `Incluye ${reporte.cantidadSocios} socios`
      : reporte.estados[0]?.socio.nombre,
  );

  const start = 7;
  sheet.getCell(`A${start}`).value = "Indicador";
  sheet.getCell(`B${start}`).value = "Valor";
  paintHeader(sheet.getRow(start), 2);

  const metrics: Array<[string, number]> = [
    ["Total aportado", n(reporte.totales.totalAportado)],
    ["Total retirado", n(reporte.totales.totalRetirado)],
    ["Saldo disponible en ahorros", n(reporte.totales.saldoDisponible)],
    ["Capital pendiente en prestamos", n(reporte.totales.totalCapitalPendiente)],
    ["Deuda estimada prestamos", n(reporte.totales.totalDeudaEstimada)],
    ["Prestamos activos / vencidos", reporte.totales.cantidadPrestamosActivos],
    ["Movimientos en el periodo", reporte.totales.cantidadMovimientos],
  ];

  metrics.forEach((row, idx) => {
    const r = sheet.getRow(start + 1 + idx);
    r.getCell(1).value = row[0];
    r.getCell(2).value = row[1];
    if (idx < 5) applyMoney(r.getCell(2));
    thinBorder(r, 2);
  });

  sheet.getColumn(1).width = 36;
  sheet.getColumn(2).width = 22;

  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function buildLibroAhorros(reporte: EstadosCuentaReporte): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  wb.created = new Date(reporte.generadoEn);
  const usedNames = new Set<string>();

  const resumen = wb.addWorksheet("00 Resumen Ahorros", {
    views: [{ state: "frozen", ySplit: 7 }],
  });
  writeTitleBlock(
    resumen,
    "Libro de Ahorros — Resumen",
    reporte,
    "Saldo y actividad de ahorro por socio",
  );

  const header = resumen.addRow([
    "N°",
    "Socio",
    "Documento",
    "Estado",
    "Saldo inicial periodo",
    "Ingresos periodo",
    "Retiros",
    "Saldo actual",
    "Movimientos",
    "Hoja detalle",
  ]);
  paintHeader(header, 10);

  const hojasSocios = reporte.estados.map((estado, index) => ({
    estado,
    index,
    sheetName: sheetName(
      `${String(index + 1).padStart(2, "0")} ${estado.socio.nombre}`,
      usedNames,
    ),
  }));

  hojasSocios.forEach(({ estado, index, sheetName: sheetRef }) => {
    const movs = movimientosAhorro(estado);
    const ingresos = movs
      .filter((m) => isIngresoAhorro(m.tipo))
      .reduce((sum, m) => sum + n(m.monto), 0);
    const retiros = movs
      .filter((m) => m.tipo === "RETIRO")
      .reduce((sum, m) => sum + n(m.monto), 0);

    const row = resumen.addRow([
      index + 1,
      estado.socio.nombre,
      `${estado.socio.tipoDocumento} ${estado.socio.numeroDocumento}`,
      ESTADO_SOCIO[estado.socio.estado] ?? estado.socio.estado,
      n(estado.resumenAhorros.saldoInicialPeriodo),
      round2(ingresos),
      round2(retiros),
      n(estado.resumenAhorros.saldoDisponible),
      movs.length,
      sheetRef,
    ]);
    for (const c of [5, 6, 7, 8]) applyMoney(row.getCell(c));
    thinBorder(row, 10);
  });

  for (let c = 1; c <= 10; c += 1) resumen.getColumn(c).width = c === 2 ? 28 : 16;

  hojasSocios.forEach(({ estado, sheetName: name }) => {
    const sheet = wb.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 10 }],
    });

    writeTitleBlock(sheet, "Libro de Ahorros — Estado de cuenta", reporte);

    sheet.mergeCells("A7:H7");
    sheet.getCell("A7").value = `Socio: ${estado.socio.nombre}`;
    sheet.getCell("A7").font = { bold: true, size: 12 };
    sheet.getCell("A7").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.socioBg },
    };

    sheet.getCell("A8").value = "Documento";
    sheet.getCell("B8").value =
      `${estado.socio.tipoDocumento} ${estado.socio.numeroDocumento}`;
    sheet.getCell("C8").value = "Telefono";
    sheet.getCell("D8").value = estado.socio.telefono;
    sheet.getCell("E8").value = "Estado";
    sheet.getCell("F8").value = ESTADO_SOCIO[estado.socio.estado] ?? estado.socio.estado;

    sheet.getCell("A9").value = "Saldo inicial periodo";
    sheet.getCell("B9").value = n(estado.resumenAhorros.saldoInicialPeriodo);
    applyMoney(sheet.getCell("B9"));
    sheet.getCell("C9").value = "Saldo actual";
    sheet.getCell("D9").value = n(estado.resumenAhorros.saldoDisponible);
    applyMoney(sheet.getCell("D9"));

    const colHeader = sheet.addRow([
      "N°",
      "Fecha",
      "Hora",
      "Tipo",
      "Concepto / descripcion",
      "Ingreso",
      "Egreso",
      "Saldo",
    ]);
    paintHeader(colHeader, 8);

    const movs = movimientosAhorro(estado);
    const months = groupByMonth(movs);
    let saldo = n(estado.resumenAhorros.saldoInicialPeriodo);
    let seq = 1;

    if (months.length === 0) {
      const empty = sheet.addRow([
        "",
        "",
        "",
        "",
        "Sin movimientos de ahorro en el periodo",
        "",
        "",
        saldo,
      ]);
      applyMoney(empty.getCell(8));
      thinBorder(empty, 8);
    }

    for (const [key, items] of months) {
      const monthRow = sheet.addRow([monthLabel(key), "", "", "", "", "", "", ""]);
      sheet.mergeCells(`A${monthRow.number}:H${monthRow.number}`);
      monthRow.getCell(1).font = { bold: true, size: 11 };
      monthRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.monthBg },
      };

      let mesIn = 0;
      let mesOut = 0;

      for (const mov of items) {
        const amount = n(mov.monto);
        const ingreso = isIngresoAhorro(mov.tipo) ? amount : 0;
        const egreso = mov.tipo === "RETIRO" ? amount : 0;
        saldo = round2(saldo + ingreso - egreso);
        mesIn += ingreso;
        mesOut += egreso;

        const row = sheet.addRow([
          seq,
          formatFecha(mov.createdAt),
          formatHora(mov.createdAt),
          TIPO_LABEL[mov.tipo] ?? mov.tipo,
          mov.descripcion ?? TIPO_LABEL[mov.tipo] ?? mov.tipo,
          ingreso || null,
          egreso || null,
          saldo,
        ]);
        if (ingreso) applyMoney(row.getCell(6));
        if (egreso) applyMoney(row.getCell(7));
        applyMoney(row.getCell(8));
        thinBorder(row, 8);
        seq += 1;
      }

      const totalMes = sheet.addRow([
        "",
        "",
        "",
        "",
        `Total ${monthLabel(key)}`,
        round2(mesIn),
        round2(mesOut),
        saldo,
      ]);
      totalMes.font = { bold: true };
      for (let c = 1; c <= 8; c += 1) {
        totalMes.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.totalBg },
        };
      }
      applyMoney(totalMes.getCell(6));
      applyMoney(totalMes.getCell(7));
      applyMoney(totalMes.getCell(8));
      thinBorder(totalMes, 8);
      sheet.addRow([]);
    }

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 10;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 36;
    sheet.getColumn(6).width = 12;
    sheet.getColumn(7).width = 12;
    sheet.getColumn(8).width = 12;
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function buildLibroPrestamos(reporte: EstadosCuentaReporte): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  wb.created = new Date(reporte.generadoEn);
  const usedNames = new Set<string>();

  const resumen = wb.addWorksheet("00 Resumen Prestamos", {
    views: [{ state: "frozen", ySplit: 7 }],
  });
  writeTitleBlock(resumen, "Libro de Prestamos — Resumen", reporte, "Cartera por socio");

  const header = resumen.addRow([
    "N°",
    "Socio",
    "Documento",
    "Prestamos",
    "Activos/Vencidos",
    "Capital pendiente",
    "Deuda estimada",
    "Hoja detalle",
  ]);
  paintHeader(header, 8);

  const hojasSocios = reporte.estados.map((estado, index) => ({
    estado,
    index,
    sheetName: sheetName(
      `${String(index + 1).padStart(2, "0")} ${estado.socio.nombre}`,
      usedNames,
    ),
  }));

  hojasSocios.forEach(({ estado, index, sheetName: sheetRef }) => {
    const row = resumen.addRow([
      index + 1,
      estado.socio.nombre,
      estado.socio.numeroDocumento,
      estado.resumenPrestamos.prestamos.length,
      estado.resumenPrestamos.cantidadActivos,
      n(estado.resumenPrestamos.totalCapitalPendiente),
      n(estado.resumenPrestamos.totalDeudaEstimada),
      sheetRef,
    ]);
    applyMoney(row.getCell(6));
    applyMoney(row.getCell(7));
    thinBorder(row, 8);
  });
  for (let c = 1; c <= 8; c += 1) resumen.getColumn(c).width = c === 2 ? 28 : 16;

  hojasSocios.forEach(({ estado, sheetName: name }) => {
    const sheet = wb.addWorksheet(name, { views: [{ showGridLines: false }] });
    writeTitleBlock(sheet, "Libro de Prestamos — Detalle por socio", reporte);

    sheet.mergeCells("A7:J7");
    sheet.getCell("A7").value =
      `Socio: ${estado.socio.nombre}  ·  ${estado.socio.tipoDocumento} ${estado.socio.numeroDocumento}`;
    sheet.getCell("A7").font = { bold: true, size: 12 };
    sheet.getCell("A7").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.socioBg },
    };

    if (!estado.resumenPrestamos.prestamos.length) {
      sheet.addRow(["Sin prestamos registrados para este socio."]);
      return;
    }

    estado.resumenPrestamos.prestamos.forEach((prestamo, pIndex) => {
      sheet.addRow([]);
      const title = sheet.addRow([
        `Prestamo ${pIndex + 1}  ·  Alta ${formatFecha(prestamo.createdAt)}  ·  Estado ${prestamo.estado}`,
      ]);
      sheet.mergeCells(`A${title.number}:J${title.number}`);
      title.getCell(1).font = { bold: true, color: { argb: COLORS.headerFg } };
      title.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.accentBg },
      };

      const meta = sheet.addRow([
        "Capital original",
        n(prestamo.monto),
        "Saldo capital",
        n(prestamo.saldo),
        "Interes %",
        n(prestamo.interes),
        "Mora %",
        n(prestamo.tasaMora),
        "Vence",
        formatFecha(prestamo.fechaVencimiento),
      ]);
      applyMoney(meta.getCell(2));
      applyMoney(meta.getCell(4));
      thinBorder(meta, 10);

      const deuda = sheet.addRow([
        "Interes pendiente",
        n(prestamo.interesPendiente),
        "Mora pendiente",
        n(prestamo.moraPendiente),
        "Deuda total",
        n(prestamo.deudaTotal),
        "",
        "",
        "",
        "",
      ]);
      applyMoney(deuda.getCell(2));
      applyMoney(deuda.getCell(4));
      applyMoney(deuda.getCell(6));
      thinBorder(deuda, 10);

      const payHeader = sheet.addRow([
        "N°",
        "Fecha abono",
        "Hora",
        "Total abono",
        "A capital",
        "A interes",
        "A mora",
        "Saldo ant.",
        "Saldo nuevo",
        "ID pago",
      ]);
      paintHeader(payHeader, 10);

      if (!prestamo.pagos.length) {
        const empty = sheet.addRow([
          "",
          "",
          "",
          "Sin abonos en el periodo",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
        thinBorder(empty, 10);
      } else {
        prestamo.pagos.forEach((pago, i) => {
          const row = sheet.addRow([
            i + 1,
            formatFecha(pago.fechaPago),
            formatHora(pago.fechaPago),
            n(pago.monto),
            n(pago.capitalPagado),
            n(pago.interesPagado),
            n(pago.moraPagada),
            n(pago.saldoAnterior),
            n(pago.saldoNuevo),
            pago.id,
          ]);
          for (const col of [4, 5, 6, 7, 8, 9]) applyMoney(row.getCell(col));
          thinBorder(row, 10);
        });
      }
    });

    for (let c = 1; c <= 10; c += 1) {
      sheet.getColumn(c).width = c === 10 ? 36 : 13;
    }
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildLibrosEstadosCuentaZip(params: {
  socioId?: string;
  desde?: Date;
  hasta?: Date;
}): Promise<{ buffer: Buffer; filename: string }> {
  const reporte = await generarEstadosCuentaReporte(params);
  const zip = new JSZip();

  const [resumen, ahorros, prestamos] = await Promise.all([
    buildLibroResumen(reporte),
    buildLibroAhorros(reporte),
    buildLibroPrestamos(reporte),
  ]);

  zip.file("01_Resumen_General.xlsx", resumen);
  zip.file("02_Libro_Ahorros.xlsx", ahorros);
  zip.file("03_Libro_Prestamos.xlsx", prestamos);
  zip.file(
    "LEEME.txt",
    [
      `${BRAND}`,
      "Paquete de libros de estados de cuenta",
      `Periodo: ${periodoTexto(reporte.periodo)}`,
      `Generado: ${formatFechaHora(reporte.generadoEn)}`,
      "",
      "1) Resumen general",
      "2) Libro de Ahorros (hoja por socio, movimientos por mes)",
      "3) Libro de Prestamos (detalle y abonos por socio)",
      "",
    ].join("\n"),
  );

  const packed = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const stamp = formatFecha(reporte.generadoEn).replace(/\//g, "-");
  const filename =
    reporte.ambito === "SOCIO" && reporte.estados[0]
      ? `libros-estado-cuenta-${reporte.estados[0].socio.numeroDocumento}-${stamp}.zip`
      : `libros-estados-cuenta-todos-${stamp}.zip`;

  return { buffer: Buffer.from(packed), filename };
}
