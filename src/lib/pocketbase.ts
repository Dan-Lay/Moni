import { supabase } from "./supabase";
import {
  Transaction, FinancialConfig, DesapegoItem, PlannedEntry,
  TransactionSource, TransactionCategory, SpouseProfile, RecurrenceType,
  toISODate, toBRL, toMiles,
} from "./types";

// ── Type mappers: Supabase row → App types ──

export function mapTransaction(r: Record<string, any>): Transaction {
  return {
    id: r.id,
    date: toISODate(r.date?.split("T")[0] || r.date),
    description: r.description || "",
    treatedName: r.treated_name || undefined,
    amount: toBRL(r.amount || 0),
    source: (r.source || "unknown") as TransactionSource,
    category: (r.category || "outros") as TransactionCategory,
    milesGenerated: toMiles(r.miles_generated || 0),
    isInefficient: !!r.is_inefficient,
    isInternational: !!r.is_international,
    iofAmount: toBRL(r.iof_amount || 0),
    establishment: r.establishment || "",
    spouseProfile: (r.spouse_profile || "familia") as SpouseProfile,
    isAdditionalCard: !!r.is_additional_card,
  };
}

export function mapPlannedEntry(r: Record<string, any>): PlannedEntry {
  return {
    id: r.id,
    name: r.name || "",
    amount: r.amount || 0,
    category: (r.category || "outros") as TransactionCategory,
    dueDate: toISODate(r.due_date?.split("T")[0] || r.due_date),
    recurrence: (r.recurrence || "unico") as RecurrenceType,
    spouseProfile: (r.spouse_profile || "familia") as SpouseProfile,
    conciliado: !!r.conciliado,
    realAmount: r.real_amount ?? undefined,
    createdAt: toISODate(r.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]),
  };
}

export function mapDesapegoItem(r: Record<string, any>): DesapegoItem {
  return {
    id: r.id,
    name: r.name || "",
    value: r.value || 0,
    sold: !!r.sold,
  };
}

export function mapFinancialConfig(r: Record<string, any>): FinancialConfig {
  return {
    salarioLiquido: r.salario_liquido ?? 12000,
    milhasAtuais: r.milhas_atuais ?? 50000,
    metaDisney: r.meta_disney ?? 600000,
    cotacaoDolar: r.cotacao_dolar ?? 5.0,
    reservaUSD: r.reserva_usd ?? 1200,
    metaUSD: r.meta_usd ?? 8000,
    cotacaoEuro: r.cotacao_euro ?? 5.65,
    reservaEUR: r.reserva_eur ?? 500,
    metaEUR: r.meta_eur ?? 6000,
    cotacaoMediaDCA: r.cotacao_media_dca ?? 5.42,
    cotacaoMediaDCAEUR: r.cotacao_media_dca_eur ?? 5.80,
    maxJantaresMes: r.max_jantares_mes ?? 2,
    maxGastoJantar: r.max_gasto_jantar ?? 250,
    aportePercentual: r.aporte_percentual ?? 15,
    iofInternacional: r.iof_internacional ?? 4.38,
    limiteSeguranca: r.limite_seguranca ?? 2000,
    maxCinemasMes: r.max_cinemas_mes ?? 2,
    maxGastoCinema: r.max_gasto_cinema ?? 60,
    customCategories: Array.isArray(r.custom_categories)
      ? r.custom_categories
      : (r.custom_categories?.items ?? []),
    hiddenBuiltInCategories: Array.isArray(r.custom_categories)
      ? []
      : (r.custom_categories?.hidden ?? []),
    renamedBuiltInCategories: Array.isArray(r.custom_categories)
      ? {}
      : (r.custom_categories?.renamed ?? {}),
  };
}

// ── CRUD API functions ──

export async function fetchAllTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTransaction);
}

export async function createTransactions(txs: Transaction[], userId: string): Promise<Transaction[]> {
  const rows = txs.map((tx) => ({
    date: tx.date,
    description: tx.description,
    treated_name: tx.treatedName ?? null,
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
    user_id: userId,
  }));
  const { data, error } = await supabase.from("transactions").insert(rows).select();
  if (error) throw error;
  return (data || []).map(mapTransaction);
}

export async function updateTransaction(
  id: string,
  patch: Partial<Pick<Transaction, "category" | "amount" | "spouseProfile" | "description" | "treatedName">>
): Promise<Transaction> {
  const data: Record<string, unknown> = {};
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.amount !== undefined) data.amount = patch.amount;
  if (patch.spouseProfile !== undefined) data.spouse_profile = patch.spouseProfile;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.treatedName !== undefined) data.treated_name = patch.treatedName;
  const { data: row, error } = await supabase.from("transactions").update(data).eq("id", id).select().single();
  if (error) throw error;
  return mapTransaction(row);
}

export async function fetchConfig(userId: string): Promise<{ id: string; config: FinancialConfig; jantaresUsados: number; cinemasUsados: number }> {
  const { data, error } = await supabase
    .from("financial_config")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return { id: data.id, config: mapFinancialConfig(data), jantaresUsados: data.jantares_usados ?? 0, cinemasUsados: data.cinemas_usados ?? 0 };
  }

  const defaults = {
    salario_liquido: 12000, milhas_atuais: 50000, meta_disney: 600000,
    cotacao_dolar: 5.0, reserva_usd: 1200, meta_usd: 8000,
    cotacao_euro: 5.65, reserva_eur: 500, meta_eur: 6000,
    cotacao_media_dca: 5.42, cotacao_media_dca_eur: 5.80,
    max_jantares_mes: 2, max_gasto_jantar: 250, aporte_percentual: 15,
    iof_internacional: 4.38, limite_seguranca: 2000,
    max_cinemas_mes: 2, max_gasto_cinema: 60, jantares_usados: 0, cinemas_usados: 0,
    user_id: userId,
  };
  const { data: created, error: createErr } = await supabase.from("financial_config").insert(defaults).select().single();
  if (createErr) throw createErr;
  return { id: created.id, config: mapFinancialConfig(created), jantaresUsados: 0, cinemasUsados: 0 };
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
  if (
    patch.customCategories !== undefined ||
    patch.hiddenBuiltInCategories !== undefined ||
    patch.renamedBuiltInCategories !== undefined
  ) {
    data.custom_categories = {
      items: patch.customCategories ?? [],
      hidden: patch.hiddenBuiltInCategories ?? [],
      renamed: patch.renamedBuiltInCategories ?? {},
    };
  }
  const { data: row, error } = await supabase.from("financial_config").update(data).eq("id", configId).select().single();
  if (error) throw error;
  return mapFinancialConfig(row);
}

export async function updateJantaresRemote(configId: string, count: number): Promise<void> {
  const { error } = await supabase.from("financial_config").update({ jantares_usados: count }).eq("id", configId);
  if (error) throw error;
}

export async function updateCinemasRemote(configId: string, count: number): Promise<void> {
  const { error } = await supabase.from("financial_config").update({ cinemas_usados: count }).eq("id", configId);
  if (error) throw error;
}

export async function fetchPlannedEntries(userId: string): Promise<PlannedEntry[]> {
  const { data, error } = await supabase
    .from("planned_entries")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPlannedEntry);
}

export async function createPlannedEntry(entry: PlannedEntry, userId: string): Promise<PlannedEntry> {
  const { data, error } = await supabase.from("planned_entries").insert({
    name: entry.name,
    amount: entry.amount,
    category: entry.category,
    due_date: entry.dueDate,
    recurrence: entry.recurrence,
    spouse_profile: entry.spouseProfile,
    conciliado: entry.conciliado,
    real_amount: entry.realAmount ?? null,
    user_id: userId,
  }).select().single();
  if (error) throw error;
  return mapPlannedEntry(data);
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
  const { data: row, error } = await supabase.from("planned_entries").update(data).eq("id", id).select().single();
  if (error) throw error;
  return mapPlannedEntry(row);
}

export async function deletePlannedEntryRemote(id: string): Promise<void> {
  const { error } = await supabase.from("planned_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchDesapegoItems(userId: string): Promise<DesapegoItem[]> {
  const { data, error } = await supabase.from("desapego_items").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data || []).map(mapDesapegoItem);
}

export async function saveDesapegoItems(items: DesapegoItem[], userId: string): Promise<void> {
  await supabase.from("desapego_items").delete().eq("user_id", userId);
  if (items.length === 0) return;
  const rows = items.map((item) => ({
    name: item.name,
    value: item.value,
    sold: item.sold,
    user_id: userId,
  }));
  const { error } = await supabase.from("desapego_items").insert(rows);
  if (error) throw error;
}
