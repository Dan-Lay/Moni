import { AppData, FinancialConfig, DesapegoItem, Transaction } from "./types";

const STORAGE_KEY = "finwar-data";

const DEFAULT_CONFIG: FinancialConfig = {
  salario: 12000,
  milhasAcumuladas: 50000,
  metaMilhas: 600000,
  cotacaoDolar: 5.0,
  reservaUSD: 1200,
  metaUSD: 8000,
  cotacaoMediaDCA: 5.42,
  maxJantaresMes: 2,
  maxGastoJantar: 250,
  aportePercentual: 15,
};

const DEFAULT_DESAPEGO: DesapegoItem[] = [
  { id: 1, name: "Carrinho de bebê Chicco", value: 450, sold: false },
  { id: 2, name: "Monitor Samsung 24\"", value: 600, sold: true },
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
    updatedAt: new Date().toISOString(),
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const parsed = JSON.parse(raw) as AppData;
    // Merge with defaults for any missing keys
    return {
      ...getDefaultData(),
      ...parsed,
      config: { ...DEFAULT_CONFIG, ...parsed.config },
    };
  } catch {
    return getDefaultData();
  }
}

export function saveAppData(data: AppData): void {
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addTransactions(newTxs: Transaction[]): AppData {
  const data = loadAppData();
  // Deduplicate by date+amount+description
  const existingKeys = new Set(
    data.transactions.map((t) => `${t.date}|${t.amount}|${t.description}`)
  );
  const unique = newTxs.filter(
    (t) => !existingKeys.has(`${t.date}|${t.amount}|${t.description}`)
  );
  data.transactions = [...data.transactions, ...unique].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  saveAppData(data);
  return data;
}

export function updateConfig(partial: Partial<FinancialConfig>): AppData {
  const data = loadAppData();
  data.config = { ...data.config, ...partial };
  saveAppData(data);
  return data;
}

export function updateDesapego(items: DesapegoItem[]): AppData {
  const data = loadAppData();
  data.desapegoItems = items;
  saveAppData(data);
  return data;
}

export function updateJantares(count: number): AppData {
  const data = loadAppData();
  data.jantaresUsados = count;
  saveAppData(data);
  return data;
}

// ── Computed helpers ──
export function getCurrentMonthTransactions(txs: Transaction[]): Transaction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return txs.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function sumByCategory(txs: Transaction[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of txs) {
    if (t.amount < 0) {
      result[t.category] = (result[t.category] || 0) + Math.abs(t.amount);
    }
  }
  return result;
}

export function totalMilesFromTransactions(txs: Transaction[]): number {
  return txs.reduce((acc, t) => acc + t.milesGenerated, 0);
}

export function topEstablishments(txs: Transaction[], limit = 5) {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.amount < 0 && t.establishment) {
      map[t.establishment] = (map[t.establishment] || 0) + Math.abs(t.amount);
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, amount]) => ({ name, amount }));
}

export function efficiencyStats(txs: Transaction[]) {
  const debits = txs.filter((t) => t.amount < 0);
  const totalSpent = debits.reduce((a, t) => a + Math.abs(t.amount), 0);
  const santanderSpent = debits
    .filter((t) => t.source === "santander")
    .reduce((a, t) => a + Math.abs(t.amount), 0);
  const efficiency = totalSpent > 0 ? (santanderSpent / totalSpent) * 100 : 100;
  const lostMiles = debits
    .filter((t) => t.isInefficient)
    .reduce((a, t) => a + Math.round((Math.abs(t.amount) / 5) * 2), 0);
  return { totalSpent, santanderSpent, efficiency, lostMiles };
}
