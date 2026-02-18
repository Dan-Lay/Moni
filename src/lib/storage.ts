import {
  AppData, FinancialConfig, DesapegoItem, Transaction,
  EfficiencyStats, MonthSummary, CashFlowPoint, EstablishmentRank,
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

export function sumByCategory(txs: readonly Transaction[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of txs) {
    if (t.amount < 0) {
      result[t.category] = (result[t.category] || 0) + Math.abs(t.amount);
    }
  }
  return result;
}

export function totalMilesFromTransactions(txs: readonly Transaction[]): number {
  return txs.reduce((acc, t) => acc + t.milesGenerated, 0);
}

export function topEstablishments(txs: readonly Transaction[], limit = 5): EstablishmentRank[] {
  const map: Record<string, { amount: number; count: number }> = {};
  for (const t of txs) {
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

export function buildCashFlowProjection(txs: readonly Transaction[], config: FinancialConfig): CashFlowPoint[] {
  const monthTxs = getCurrentMonthTransactions(txs);
  if (monthTxs.length === 0) {
    // Generate demo projection
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

  // Build cumulative from transactions
  const sorted = [...monthTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let saldo = config.salarioLiquido;
  const points: CashFlowPoint[] = [{ dia: "01", saldo }];

  const byDay: Record<string, number> = {};
  for (const t of sorted) {
    const day = new Date(t.date).getDate().toString().padStart(2, "0");
    byDay[day] = (byDay[day] || 0) + t.amount;
  }

  for (const [dia, delta] of Object.entries(byDay).sort()) {
    saldo += delta;
    points.push({ dia, saldo: Math.round(saldo) });
  }

  return points;
}
