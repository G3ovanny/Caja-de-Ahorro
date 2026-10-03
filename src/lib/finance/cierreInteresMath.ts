export const PORCENTAJE_EMPRESA_CIERRE = 35;
export const PORCENTAJE_SOCIOS_CIERRE = 65;

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Periodo mensual en UTC: [inicio, fin] inclusive por calendario. */
export function periodoMensualUtc(anio: number, mes: number): {
  periodoInicio: Date;
  periodoFin: Date;
  diasDelMes: number;
} {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    throw new Error("El anio del cierre no es valido");
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error("El mes del cierre no es valido");
  }

  const periodoInicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0, 0));
  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const periodoFin = new Date(Date.UTC(anio, mes - 1, diasDelMes, 23, 59, 59, 999));

  return { periodoInicio, periodoFin, diasDelMes };
}

export type PesoSocio = {
  socioId: string;
  saldoPromedio: number;
};

export type AsignacionSocio = PesoSocio & {
  participacionPct: number;
  montoAsignado: number;
};

/** Reparte `bolsa` en centavos con metodo del resto mayor. */
export function asignarBolsaProporcional(
  bolsa: number,
  pesos: PesoSocio[],
): AsignacionSocio[] {
  const bolsaCents = Math.round(round2(bolsa) * 100);
  const elegibles = pesos.filter((item) => item.saldoPromedio > 0);

  if (bolsaCents <= 0 || elegibles.length === 0) {
    return pesos.map((item) => ({
      ...item,
      participacionPct: 0,
      montoAsignado: 0,
    }));
  }

  const totalPeso = elegibles.reduce((sum, item) => sum + item.saldoPromedio, 0);
  if (totalPeso <= 0) {
    return pesos.map((item) => ({
      ...item,
      participacionPct: 0,
      montoAsignado: 0,
    }));
  }

  const draft = elegibles.map((item) => {
    const exactCents = (bolsaCents * item.saldoPromedio) / totalPeso;
    const floorCents = Math.floor(exactCents);
    return {
      ...item,
      floorCents,
      fraction: exactCents - floorCents,
      participacionPct: round2((item.saldoPromedio / totalPeso) * 100),
    };
  });

  let assigned = draft.reduce((sum, item) => sum + item.floorCents, 0);
  let remaining = bolsaCents - assigned;

  draft
    .slice()
    .sort((a, b) => b.fraction - a.fraction || b.saldoPromedio - a.saldoPromedio)
    .forEach((item) => {
      if (remaining <= 0) return;
      item.floorCents += 1;
      remaining -= 1;
    });

  const byId = new Map(draft.map((item) => [item.socioId, item]));

  return pesos.map((item) => {
    const found = byId.get(item.socioId);
    if (!found) {
      return {
        ...item,
        participacionPct: 0,
        montoAsignado: 0,
      };
    }
    return {
      socioId: found.socioId,
      saldoPromedio: round2(found.saldoPromedio),
      participacionPct: found.participacionPct,
      montoAsignado: found.floorCents / 100,
    };
  });
}
