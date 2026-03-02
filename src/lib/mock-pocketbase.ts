/**
 * Mock PocketBase service — simulates PB responses in-memory
 * Activated automatically when the real PocketBase server is unreachable
 */
import {
  Transaction, FinancialConfig, DesapegoItem, PlannedEntry,
  toISODate, toBRL, toMiles,
  TransactionCategory, SpouseProfile,
} from "./types";
import {
  MOCK_TRANSACTIONS, MOCK_CONFIG, MOCK_PLANNED_ENTRIES,
  MOCK_DESAPEGO_ITEMS, MOCK_USER, MOCK_JANTARES_USADOS, MOCK_CINEMAS_USADOS,
} from "./mock-data";

// ── In-memory state ──
let transactions = [...MOCK_TRANSACTIONS];
let config = { ...MOCK_CONFIG };
let configId = "mock_config_001";
let plannedEntries = [...MOCK_PLANNED_ENTRIES];
let desapegoItems = [...MOCK_DESAPEGO_ITEMS];
let jantaresUsados = MOCK_JANTARES_USADOS;
let cinemasUsados = MOCK_CINEMAS_USADOS;
let nextId = 1000;

function genId(prefix: string) {
  return `${prefix}_${nextId++}`;
}

// ── Mock CRUD functions (same signatures as pocketbase.ts exports) ──

export async function fetchAllTransactions(_userId: string): Promise<Transaction[]> {
  return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createTransactions(txs: Transaction[], _userId: string): Promise<Transaction[]> {
  const created = txs.map((tx) => ({ ...tx, id: genId("mock_tx") }));
  transactions.push(...created);
  return created;
}

export async function updateTransaction(
  id: string,
  patch: Partial<Pick<Transaction, "category" | "amount" | "spouseProfile" | "description" | "treatedName">>
): Promise<Transaction> {
  const idx = transactions.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Transaction not found");
  const updated = { ...transactions[idx], ...patch } as Transaction;
  transactions[idx] = updated;
  return updated;
}

export async function fetchConfig(_userId: string): Promise<{ id: string; config: FinancialConfig; jantaresUsados: number; cinemasUsados: number }> {
  return { id: configId, config: { ...config }, jantaresUsados, cinemasUsados };
}

export async function updateConfigRemote(_configId: string, patch: Partial<FinancialConfig>): Promise<FinancialConfig> {
  config = { ...config, ...patch };
  return { ...config };
}

export async function updateJantaresRemote(_configId: string, count: number): Promise<void> {
  jantaresUsados = count;
}

export async function updateCinemasRemote(_configId: string, count: number): Promise<void> {
  cinemasUsados = count;
}

export async function fetchPlannedEntries(_userId: string): Promise<PlannedEntry[]> {
  return [...plannedEntries];
}

export async function createPlannedEntry(entry: PlannedEntry, _userId: string): Promise<PlannedEntry> {
  const created = { ...entry, id: genId("mock_pe") };
  plannedEntries.push(created);
  return created;
}

export async function createPlannedEntries(entries: PlannedEntry[], _userId: string): Promise<PlannedEntry[]> {
  const created = entries.map((e) => ({ ...e, id: genId("mock_pe") }));
  plannedEntries.push(...created);
  return created;
}

export async function updatePlannedEntryRemote(id: string, patch: Partial<PlannedEntry>): Promise<PlannedEntry> {
  const idx = plannedEntries.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error("Planned entry not found");
  const updated = { ...plannedEntries[idx], ...patch } as PlannedEntry;
  plannedEntries[idx] = updated;
  return updated;
}

export async function deletePlannedEntryRemote(id: string): Promise<void> {
  plannedEntries = plannedEntries.filter((e) => e.id !== id);
}

export async function fetchDesapegoItems(_userId: string): Promise<DesapegoItem[]> {
  return [...desapegoItems];
}

export async function saveDesapegoItems(items: DesapegoItem[], _userId: string): Promise<void> {
  desapegoItems = [...items];
}

export async function deleteTransaction(id: string): Promise<void> {
  transactions = transactions.filter((t) => t.id !== id);
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  const idSet = new Set(ids);
  transactions = transactions.filter((t) => !idSet.has(t.id));
}

// ── Mock auth ──
export const mockUser = MOCK_USER;

// ── Mock PB object (for subscribe/unsubscribe compat) ──
export const mockPb = {
  collection: (_name: string) => ({
    subscribe: async (_topic: string, _cb: Function) => () => {},
    unsubscribe: async (_topic: string) => {},
  }),
};
