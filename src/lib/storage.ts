import {
  AppData, FinancialConfig, DesapegoItem, Transaction,
  EfficiencyStats, MonthSummary, CashFlowPoint, EstablishmentRank,
  SpouseProfile, PlannedEntry,
  toISODate, toBRL, toMiles, toPercent,
} from "./types";

const STORAGE_KEY = "finwar-data";

const DEFAULT_CONFIG: FinancialConfig = {
  salarioLiquido: 12000,
  milhasAtuais: 50000,
  metaDisney: 600000,
  cotacaoDolar: 5.0,
  reservaUSD: 1200,
  metaUSD: 8000,
  cotacaoEuro: 5.65,
  reservaEUR: 500,
  metaEUR: 6000,
  cotacaoMediaDCA: 5.42,
  cotacaoMediaDCAEUR: 5.80,
  maxJantaresMes: 2,
  maxGastoJantar: 250,
  aportePercentual: 15,
  iofInternacional: 4.38,
  limiteSeguranca: 2000,
};

const DEFAULT_DESAPEGO: DesapegoItem[] = [
  { id: 1, name: "Carrinho de bebê Chicco", value: 450, sold: false },
  { id: 2, name: 'Monitor Samsung 24"', value: 600, sold: true },
  { id: 3, name: "Cadeirinha carro", value: 350, sold: false },
  { id: 4, name: "Bicicleta ergométrica", value: 800, sold: true },
  { id: 5, name: "iPhone 12 (usado)", value: 1200, sold: false },
];

function getDefaultData(): AppData {
  return {
    transactions: [],
    config: { ...DEFAULT_CONFIG },
    desapegoItems: [...DEFAULT_DESAPEGO],
    jantaresUsados: 0,
    plannedEntries: [],
    updatedAt: toISODate(new Date().toISOString()),
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw) as AppData;
    // Migrate old field names
    const config = parsed.config as any;
    return {
      ...getDefaultData(),
      ...parsed,
      config: {
        ...DEFAULT_CONFIG,
        ...config,
        salarioLiquido: config.salarioLiquido ?? config.salario ?? DEFAULT_CONFIG.salarioLiquido,
        milhasAtuais: config.milhasAtuais ?? config.milhasAcumuladas ?? DEFAULT_CONFIG.milhasAtuais,
        metaDisney: config.metaDisney ?? config.metaMilhas ?? DEFAULT_CONFIG.metaDisney,
      },
    };
  } catch {
    return getDefaultData();
  }
}

export function saveAppData(data: AppData): void {
  const toSave = { ...data, updatedAt: toISODate(new Date().toISOString()) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

export function addTransactions(newTxs: Transaction[]): AppData {
  const data = loadAppData();
  const existingKeys = new Set(
    data.transactions.map((t) => `${t.date}|${t.amount}|${t.description}`)
  );
  const unique = newTxs.filter(
    (t) => !existingKeys.has(`${t.date}|${t.amount}|${t.description}`)
  );
  const updated: AppData = {
    ...data,
    transactions: [...data.transactions, ...unique].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
  };
  saveAppData(updated);
  return updated;
}

export function updateConfig(partial: Partial<FinancialConfig>): AppData {
  const data = loadAppData();
  const updated: AppData = { ...data, config: { ...data.config, ...partial } };
  saveAppData(updated);
  return updated;
}

export function updateDesapego(items: DesapegoItem[]): AppData {
  const data = loadAppData();
  const updated: AppData = { ...data, desapegoItems: items };
  saveAppData(updated);
  return updated;
}

export function updateJantares(count: number): AppData {
  const data = loadAppData();
  const updated: AppData = { ...data, jantaresUsados: count };
  saveAppData(updated);
  return updated;
}

// ── Planned entries (manual + recurring) ──
export function addPlannedEntry(entry: PlannedEntry): AppData {
  const data = loadAppData();
  const updated: AppData = {
    ...data,
    plannedEntries: [...(data.plannedEntries ?? []), entry],
  };
  saveAppData(updated);
  return updated;
}

export function updatePlannedEntry(id: string, patch: Partial<PlannedEntry>): AppData {
  const data = loadAppData();
  const updated: AppData = {
    ...data,
    plannedEntries: (data.plannedEntries ?? []).map((e) =>
      e.id === id ? { ...e, ...patch } : e
    ),
  };
  saveAppData(updated);
  return updated;
}

export function deletePlannedEntry(id: string): AppData {
  const data = loadAppData();
  const updated: AppData = {
    ...data,
    plannedEntries: (data.plannedEntries ?? []).filter((e) => e.id !== id),
  };
  saveAppData(updated);
  return updated;
}

/**
 * Returns PlannedEntry items whose dueDate is in the future (not yet conciliated),
 * expanded for the current month based on recurrence.
 */
export function getFuturePlannedForMonth(entries: readonly PlannedEntry[]): PlannedEntry[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const result: PlannedEntry[] = [];
  for (const e of entries) {
    if (e.conciliado) continue;
    const due = new Date(e.dueDate);
    if (due >= monthStart && due <= monthEnd) {
      result.push(e);
    }
  }
  return result;
}

/**
 * Reconciliation: tries to match a transaction against an unreconciled planned entry
 * (same name fuzzy match, date within 3 days).
 */
export function tryReconcile(tx: Transaction, entries: readonly PlannedEntry[]): string | null {
  const txDate = new Date(tx.date);
  const txDesc = tx.description.toLowerCase();
  for (const e of entries) {
    if (e.conciliado) continue;
    const entryDate = new Date(e.dueDate);
    const dayDiff = Math.abs((txDate.getTime() - entryDate.getTime()) / 86400000);
    const nameMatch = txDesc.includes(e.name.toLowerCase().substring(0, 5)) || e.name.toLowerCase().includes(txDesc.substring(0, 5));
    if (dayDiff <= 3 && nameMatch) return e.id;
  }
  return null;
}

/** Edits a transaction in-place by id */
export function editTransaction(id: string, patch: Partial<Pick<Transaction, "category" | "amount" | "spouseProfile">>): AppData {
  const data = loadAppData();
  const updated: AppData = {
    ...data,
    transactions: data.transactions.map((t) =>
      t.id === id ? { ...t, ...patch } : t
    ),
  };
  saveAppData(updated);
  return updated;
}

/**
 * Historical price alert: compares current month avg per establishment
 * vs previous 3 months. Returns list of flagged transaction ids.
 */
export function getPriceAlerts(txs: readonly Transaction[]): Set<string> {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  // Group by establishment
  const byEst: Record<string, { id: string; month: number; year: number; amount: number }[]> = {};
  for (const t of txs) {
    if (t.amount >= 0 || !t.establishment) continue;
    const d = new Date(t.date);
    const key = t.establishment.toLowerCase().trim();
    if (!byEst[key]) byEst[key] = [];
    byEst[key].push({ id: t.id, month: d.getMonth(), year: d.getFullYear(), amount: Math.abs(t.amount) });
  }

  const flagged = new Set<string>();

  for (const [, entries] of Object.entries(byEst)) {
    const current = entries.filter((e) => e.year === curYear && e.month === curMonth);
    if (current.length === 0) continue;

    // Previous 3 months
    const prev3: number[] = [];
    for (let i = 1; i <= 3; i++) {
      let m = curMonth - i;
      let y = curYear;
      if (m < 0) { m += 12; y -= 1; }
      const monthEntries = entries.filter((e) => e.year === y && e.month === m);
      if (monthEntries.length > 0) {
        const avg = monthEntries.reduce((a, e) => a + e.amount, 0) / monthEntries.length;
        prev3.push(avg);
      }
    }
    if (prev3.length === 0) continue;
    const historicalAvg = prev3.reduce((a, v) => a + v, 0) / prev3.length;
    const currentAvg = current.reduce((a, e) => a + e.amount, 0) / current.length;
    if (currentAvg > historicalAvg * 1.2) {
      current.forEach((e) => flagged.add(e.id));
    }
  }

  return flagged;
}

// ── Computed helpers ──
export function getCurrentMonthTransactions(txs: readonly Transaction[]): Transaction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return txs.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function sumByCategory(
  txs: readonly Transaction[],
  profile: SpouseProfile | "todos" = "todos"
): Record<string, number> {
  const filtered = profile === "todos" ? txs : txs.filter((t) => t.spouseProfile === profile || t.spouseProfile === "familia");
  const result: Record<string, number> = {};
  for (const t of filtered) {
    if (t.amount < 0) {
      result[t.category] = (result[t.category] || 0) + Math.abs(t.amount);
    }
  }
  return result;
}

export function totalMilesFromTransactions(txs: readonly Transaction[]): number {
  return txs.reduce((acc, t) => acc + t.milesGenerated, 0);
}

export function topEstablishments(
  txs: readonly Transaction[],
  limit = 5,
  profile: SpouseProfile | "todos" = "todos"
): EstablishmentRank[] {
  const filtered = profile === "todos" ? txs : txs.filter((t) => t.spouseProfile === profile || t.spouseProfile === "familia");
  const map: Record<string, { amount: number; count: number }> = {};
  for (const t of filtered) {
    if (t.amount < 0 && t.establishment) {
      if (!map[t.establishment]) map[t.establishment] = { amount: 0, count: 0 };
      map[t.establishment].amount += Math.abs(t.amount);
      map[t.establishment].count++;
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, limit)
    .map(([name, { amount, count }]) => ({ name, amount, transactionCount: count }));
}

export function efficiencyStats(txs: readonly Transaction[]): EfficiencyStats {
  const debits = txs.filter((t) => t.amount < 0);
  const totalSpent = debits.reduce((a, t) => a + Math.abs(t.amount), 0);
  const santanderSpent = debits
    .filter((t) => t.source === "santander")
    .reduce((a, t) => a + Math.abs(t.amount), 0);
  const efficiency = totalSpent > 0 ? (santanderSpent / totalSpent) * 100 : 100;
  const lostMiles = debits
    .filter((t) => t.isInefficient)
    .reduce((a, t) => a + Math.round((Math.abs(t.amount) / 5) * 2), 0);

  // International stats
  const internationalTxs = debits.filter((t) => t.isInternational);
  const internationalSpent = internationalTxs.reduce((a, t) => a + Math.abs(t.amount), 0);
  const totalIOF = internationalTxs.reduce((a, t) => a + (t.iofAmount || 0), 0);
  // Miles that were generated considering IOF cost
  const milesAfterIOF = internationalTxs.reduce((a, t) => a + t.milesGenerated, 0);

  return {
    totalSpent,
    santanderSpent,
    efficiency: toPercent(efficiency),
    lostMiles: toMiles(lostMiles),
    internationalSpent,
    totalIOF,
    milesAfterIOF: toMiles(milesAfterIOF),
  };
}

export function getMonthSummary(txs: readonly Transaction[], config: FinancialConfig): MonthSummary {
  const monthTxs = getCurrentMonthTransactions(txs);
  const totalIncome = monthTxs.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const totalExpenses = monthTxs.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
  const milesGenerated = totalMilesFromTransactions(monthTxs);
  const investido = monthTxs
    .filter((t) => t.category === "investimentos" && t.amount < 0)
    .reduce((a, t) => a + Math.abs(t.amount), 0);
  const meta = config.salarioLiquido * (config.aportePercentual / 100);

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    milesGenerated: toMiles(milesGenerated),
    aporteRealizado: investido,
    aportePercent: toPercent(meta > 0 ? (investido / meta) * 100 : 0),
    transactionCount: monthTxs.length,
  };
}

export interface CashFlowPointExtended extends CashFlowPoint {
  readonly projecao?: number; // future planned entries (dotted)
}

/**
 * Expands a planned entry into future occurrences based on its recurrence type.
 * Returns up to `months` months of projected entries from the entry's dueDate.
 */
export function expandRecurrence(entry: PlannedEntry, months = 12): PlannedEntry[] {
  if (entry.recurrence === "unico") return [entry];
  const projections: PlannedEntry[] = [];
  const start = new Date(entry.dueDate);

  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    switch (entry.recurrence) {
      case "mensal":   d.setMonth(d.getMonth() + i); break;
      case "quinzenal": d.setDate(d.getDate() + i * 15); break;
      case "diario":   d.setDate(d.getDate() + i); break;
      case "anual":    d.setFullYear(d.getFullYear() + i); break;
    }
    projections.push({
      ...entry,
      id: `${entry.id}_proj_${i}`,
      dueDate: toISODate(d.toISOString().split("T")[0]),
      conciliado: i === 0 ? entry.conciliado : false,
    });
  }
  return projections;
}

export function buildCashFlowProjection(
  txs: readonly Transaction[],
  config: FinancialConfig,
  planned: readonly PlannedEntry[] = []
): CashFlowPointExtended[] {
  const monthTxs = getCurrentMonthTransactions(txs);
  const today = new Date();
  const todayDay = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Expand all planned entries with recurrence into projected occurrences
  const allProjected = planned.flatMap((e) => expandRecurrence(e, 12));

  // Accumulate real transactions
  const byDay: Record<string, number> = {};
  for (const t of monthTxs) {
    const day = new Date(t.date).getDate().toString().padStart(2, "0");
    byDay[day] = (byDay[day] || 0) + t.amount;
  }

  // Accumulate future planned entries for current month (not conciliated)
  const futurePlanned: Record<string, number> = {};
  for (const e of allProjected) {
    if (e.conciliado) continue;
    const d = new Date(e.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() > todayDay) {
      const day = d.getDate().toString().padStart(2, "0");
      futurePlanned[day] = (futurePlanned[day] || 0) + e.amount;
    }
  }

  if (Object.keys(byDay).length === 0 && Object.keys(futurePlanned).length === 0) {
    const s = config.salarioLiquido;
    return [
      { dia: "01", saldo: s },
      { dia: "05", saldo: s * 0.93 },
      { dia: "10", saldo: s * 0.82 },
      { dia: "15", saldo: s * 0.72 },
      { dia: "20", saldo: s * 0.62 },
      { dia: "25", saldo: s * 0.55 },
      { dia: "30", saldo: s * 0.48 },
    ];
  }

  let saldo = config.salarioLiquido;
  const points: CashFlowPointExtended[] = [{ dia: "01", saldo }];

  for (let d = 2; d <= daysInMonth; d++) {
    const dia = d.toString().padStart(2, "0");
    const realDelta = byDay[dia] || 0;
    const plannedDelta = futurePlanned[dia] || 0;
    const isPast = d <= todayDay;

    if (isPast) {
      saldo += realDelta;
      if (realDelta !== 0) points.push({ dia, saldo: Math.round(saldo) });
    } else if (plannedDelta !== 0) {
      saldo += plannedDelta;
      points.push({ dia, saldo: Math.round(saldo), projecao: Math.round(saldo) });
    }
  }

  // Ensure we always have a projection at end of month if there's future planned
  if (Object.keys(futurePlanned).length > 0) {
    const lastDia = daysInMonth.toString().padStart(2, "0");
    if (!points.find((p) => p.dia === lastDia)) {
      points.push({ dia: lastDia, projecao: Math.round(saldo) } as CashFlowPointExtended);
    }
  }

  return points;
}
