import PocketBase, { RecordModel } from "pocketbase";
import {
  Transaction, FinancialConfig, DesapegoItem, PlannedEntry,
  TransactionSource, TransactionCategory, SpouseProfile, RecurrenceType,
  toISODate, toBRL, toMiles,
} from "./types";

// PocketBase URL — configurable via env or defaults to Tailscale IP
const PB_URL = import.meta.env.VITE_POCKETBASE_URL || "http://100.82.134.109:8090";

export const pb = new PocketBase(PB_URL);

// Disable auto-cancellation so parallel requests work
pb.autoCancellation(false);

// ── Type mappers: PocketBase record → App types ──

export function mapTransaction(r: RecordModel): Transaction {
  return {
    id: r.id,
    date: toISODate(r["date"]?.split("T")[0] || r["date"]),
    description: r["description"] || "",
    amount: toBRL(r["amount"] || 0),
    source: (r["source"] || "unknown") as TransactionSource,
    category: (r["category"] || "outros") as TransactionCategory,
    milesGenerated: toMiles(r["miles_generated"] || 0),
    isInefficient: !!r["is_inefficient"],
    isInternational: !!r["is_international"],
    iofAmount: toBRL(r["iof_amount"] || 0),
    establishment: r["establishment"] || "",
    spouseProfile: (r["spouse_profile"] || "familia") as SpouseProfile,
    isAdditionalCard: !!r["is_additional_card"],
  };
}

export function mapPlannedEntry(r: RecordModel): PlannedEntry {
  return {
    id: r.id,
    name: r["name"] || "",
    amount: r["amount"] || 0,
    category: (r["category"] || "outros") as TransactionCategory,
    dueDate: toISODate(r["due_date"]?.split("T")[0] || r["due_date"]),
    recurrence: (r["recurrence"] || "unico") as RecurrenceType,
    spouseProfile: (r["spouse_profile"] || "familia") as SpouseProfile,
    conciliado: !!r["conciliado"],
    realAmount: r["real_amount"] ?? undefined,
    createdAt: toISODate(r["created"]?.split("T")[0] || new Date().toISOString().split("T")[0]),
  };
}

export function mapDesapegoItem(r: RecordModel): DesapegoItem {
  return {
    id: Number(r.id) || 0, // PB uses string IDs; we keep numeric for compat
    name: r["name"] || "",
    value: r["value"] || 0,
    sold: !!r["sold"],
  };
}

export function mapFinancialConfig(r: RecordModel): FinancialConfig {
  return {
    salarioLiquido: r["salario_liquido"] ?? 12000,
    milhasAtuais: r["milhas_atuais"] ?? 50000,
    metaDisney: r["meta_disney"] ?? 600000,
    cotacaoDolar: r["cotacao_dolar"] ?? 5.0,
    reservaUSD: r["reserva_usd"] ?? 1200,
    metaUSD: r["meta_usd"] ?? 8000,
    cotacaoEuro: r["cotacao_euro"] ?? 5.65,
    reservaEUR: r["reserva_eur"] ?? 500,
    metaEUR: r["meta_eur"] ?? 6000,
    cotacaoMediaDCA: r["cotacao_media_dca"] ?? 5.42,
    cotacaoMediaDCAEUR: r["cotacao_media_dca_eur"] ?? 5.80,
    maxJantaresMes: r["max_jantares_mes"] ?? 2,
    maxGastoJantar: r["max_gasto_jantar"] ?? 250,
    aportePercentual: r["aporte_percentual"] ?? 15,
    iofInternacional: r["iof_internacional"] ?? 4.38,
    limiteSeguranca: r["limite_seguranca"] ?? 2000,
  };
}

// ── Reverse mappers: App types → PocketBase record data ──

export function txToRecord(tx: Transaction, userId: string): Record<string, unknown> {
  return {
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    source: tx.source,
    category: tx.category,
    miles_generated: tx.milesGenerated,
    is_inefficient: tx.isInefficient,
    is_international: tx.isInternational,
    iof_amount: tx.iofAmount,
    establishment: tx.establishment,
    spouse_profile: tx.spouseProfile,
    is_additional_card: tx.isAdditionalCard,
    user: userId,
  };
}

export function plannedToRecord(e: PlannedEntry, userId: string): Record<string, unknown> {
  return {
    name: e.name,
    amount: e.amount,
    category: e.category,
    due_date: e.dueDate,
    recurrence: e.recurrence,
    spouse_profile: e.spouseProfile,
    conciliado: e.conciliado,
    real_amount: e.realAmount ?? null,
    user: userId,
  };
}

export function desapegoToRecord(item: DesapegoItem, userId: string): Record<string, unknown> {
  return {
    name: item.name,
    value: item.value,
    sold: item.sold,
    user: userId,
  };
}

export function configToRecord(cfg: Partial<FinancialConfig>, userId: string): Record<string, unknown> {
  const r: Record<string, unknown> = { user: userId };
  if (cfg.salarioLiquido !== undefined) r.salario_liquido = cfg.salarioLiquido;
  if (cfg.milhasAtuais !== undefined) r.milhas_atuais = cfg.milhasAtuais;
  if (cfg.metaDisney !== undefined) r.meta_disney = cfg.metaDisney;
  if (cfg.cotacaoDolar !== undefined) r.cotacao_dolar = cfg.cotacaoDolar;
  if (cfg.reservaUSD !== undefined) r.reserva_usd = cfg.reservaUSD;
  if (cfg.metaUSD !== undefined) r.meta_usd = cfg.metaUSD;
  if (cfg.cotacaoEuro !== undefined) r.cotacao_euro = cfg.cotacaoEuro;
  if (cfg.reservaEUR !== undefined) r.reserva_eur = cfg.reservaEUR;
  if (cfg.metaEUR !== undefined) r.meta_eur = cfg.metaEUR;
  if (cfg.cotacaoMediaDCA !== undefined) r.cotacao_media_dca = cfg.cotacaoMediaDCA;
  if (cfg.cotacaoMediaDCAEUR !== undefined) r.cotacao_media_dca_eur = cfg.cotacaoMediaDCAEUR;
  if (cfg.maxJantaresMes !== undefined) r.max_jantares_mes = cfg.maxJantaresMes;
  if (cfg.maxGastoJantar !== undefined) r.max_gasto_jantar = cfg.maxGastoJantar;
  if (cfg.aportePercentual !== undefined) r.aporte_percentual = cfg.aportePercentual;
  if (cfg.iofInternacional !== undefined) r.iof_internacional = cfg.iofInternacional;
  if (cfg.limiteSeguranca !== undefined) r.limite_seguranca = cfg.limiteSeguranca;
  return r;
}

// ── CRUD API functions ──

export async function fetchAllTransactions(userId: string): Promise<Transaction[]> {
  const records = await pb.collection("transactions").getFullList({
    filter: `user = "${userId}"`,
    sort: "-date",
  });
  return records.map(mapTransaction);
}

export async function createTransactions(txs: Transaction[], userId: string): Promise<Transaction[]> {
  const created: Transaction[] = [];
  for (const tx of txs) {
    const r = await pb.collection("transactions").create(txToRecord(tx, userId));
    created.push(mapTransaction(r));
  }
  return created;
}

export async function updateTransaction(
  id: string,
  patch: Partial<Pick<Transaction, "category" | "amount" | "spouseProfile" | "description">>
): Promise<Transaction> {
  const data: Record<string, unknown> = {};
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.amount !== undefined) data.amount = patch.amount;
  if (patch.spouseProfile !== undefined) data.spouse_profile = patch.spouseProfile;
  if (patch.description !== undefined) data.description = patch.description;
  const r = await pb.collection("transactions").update(id, data);
  return mapTransaction(r);
}

export async function fetchConfig(userId: string): Promise<{ id: string; config: FinancialConfig; jantaresUsados: number }> {
  try {
    const r = await pb.collection("financial_config").getFirstListItem(`user = "${userId}"`);
    return { id: r.id, config: mapFinancialConfig(r), jantaresUsados: r["jantares_usados"] ?? 0 };
  } catch {
    // Create default config for new users
    const defaultCfg = configToRecord({
      salarioLiquido: 12000, milhasAtuais: 50000, metaDisney: 600000,
      cotacaoDolar: 5.0, reservaUSD: 1200, metaUSD: 8000,
      cotacaoEuro: 5.65, reservaEUR: 500, metaEUR: 6000,
      cotacaoMediaDCA: 5.42, cotacaoMediaDCAEUR: 5.80,
      maxJantaresMes: 2, maxGastoJantar: 250, aportePercentual: 15,
      iofInternacional: 4.38, limiteSeguranca: 2000,
    }, userId);
    const r = await pb.collection("financial_config").create(defaultCfg);
    return { id: r.id, config: mapFinancialConfig(r), jantaresUsados: 0 };
  }
}

export async function updateConfigRemote(configId: string, patch: Partial<FinancialConfig>): Promise<FinancialConfig> {
  const data: Record<string, unknown> = {};
  if (patch.salarioLiquido !== undefined) data.salario_liquido = patch.salarioLiquido;
  if (patch.milhasAtuais !== undefined) data.milhas_atuais = patch.milhasAtuais;
  if (patch.metaDisney !== undefined) data.meta_disney = patch.metaDisney;
  if (patch.cotacaoDolar !== undefined) data.cotacao_dolar = patch.cotacaoDolar;
  if (patch.reservaUSD !== undefined) data.reserva_usd = patch.reservaUSD;
  if (patch.metaUSD !== undefined) data.meta_usd = patch.metaUSD;
  if (patch.cotacaoEuro !== undefined) data.cotacao_euro = patch.cotacaoEuro;
  if (patch.reservaEUR !== undefined) data.reserva_eur = patch.reservaEUR;
  if (patch.metaEUR !== undefined) data.meta_eur = patch.metaEUR;
  if (patch.cotacaoMediaDCA !== undefined) data.cotacao_media_dca = patch.cotacaoMediaDCA;
  if (patch.cotacaoMediaDCAEUR !== undefined) data.cotacao_media_dca_eur = patch.cotacaoMediaDCAEUR;
  if (patch.maxJantaresMes !== undefined) data.max_jantares_mes = patch.maxJantaresMes;
  if (patch.maxGastoJantar !== undefined) data.max_gasto_jantar = patch.maxGastoJantar;
  if (patch.aportePercentual !== undefined) data.aporte_percentual = patch.aportePercentual;
  if (patch.iofInternacional !== undefined) data.iof_internacional = patch.iofInternacional;
  if (patch.limiteSeguranca !== undefined) data.limite_seguranca = patch.limiteSeguranca;
  const r = await pb.collection("financial_config").update(configId, data);
  return mapFinancialConfig(r);
}

export async function updateJantaresRemote(configId: string, count: number): Promise<void> {
  await pb.collection("financial_config").update(configId, { jantares_usados: count });
}

export async function fetchPlannedEntries(userId: string): Promise<PlannedEntry[]> {
  const records = await pb.collection("planned_entries").getFullList({
    filter: `user = "${userId}"`,
    sort: "-due_date",
  });
  return records.map(mapPlannedEntry);
}

export async function createPlannedEntry(entry: PlannedEntry, userId: string): Promise<PlannedEntry> {
  const r = await pb.collection("planned_entries").create(plannedToRecord(entry, userId));
  return mapPlannedEntry(r);
}

export async function updatePlannedEntryRemote(id: string, patch: Partial<PlannedEntry>): Promise<PlannedEntry> {
  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.amount !== undefined) data.amount = patch.amount;
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.dueDate !== undefined) data.due_date = patch.dueDate;
  if (patch.recurrence !== undefined) data.recurrence = patch.recurrence;
  if (patch.spouseProfile !== undefined) data.spouse_profile = patch.spouseProfile;
  if (patch.conciliado !== undefined) data.conciliado = patch.conciliado;
  if (patch.realAmount !== undefined) data.real_amount = patch.realAmount;
  const r = await pb.collection("planned_entries").update(id, data);
  return mapPlannedEntry(r);
}

export async function deletePlannedEntryRemote(id: string): Promise<void> {
  await pb.collection("planned_entries").delete(id);
}

export async function fetchDesapegoItems(userId: string): Promise<DesapegoItem[]> {
  const records = await pb.collection("desapego_items").getFullList({
    filter: `user = "${userId}"`,
  });
  return records.map(mapDesapegoItem);
}

export async function saveDesapegoItems(items: DesapegoItem[], userId: string): Promise<void> {
  // Simple strategy: delete all and recreate
  const existing = await pb.collection("desapego_items").getFullList({ filter: `user = "${userId}"` });
  for (const r of existing) {
    await pb.collection("desapego_items").delete(r.id);
  }
  for (const item of items) {
    await pb.collection("desapego_items").create(desapegoToRecord(item, userId));
  }
}
