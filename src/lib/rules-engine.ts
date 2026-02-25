/**
 * Categorization Rules Engine — fetches rules once, matches in-memory
 */
import { supabase } from "./supabase";
import { TransactionCategory, SpouseProfile } from "./types";

export interface CategorizationRule {
  id: string;
  keyword: string;
  category: TransactionCategory;
  profile: SpouseProfile;
  userId: string;
}

export async function fetchCategorizationRules(userId: string): Promise<CategorizationRule[]> {
  try {
    const { data, error } = await supabase
      .from("categorization_rules")
      .select("*")
      .eq("user_id", userId);
    if (error) return [];
    return (data || []).map((r) => ({
      id: r.id,
      keyword: (r.keyword || "").toLowerCase(),
      category: (r.category || "outros") as TransactionCategory,
      profile: (r.profile || "familia") as SpouseProfile,
      userId: r.user_id || "",
    }));
  } catch {
    return [];
  }
}

export async function createCategorizationRule(
  keyword: string,
  category: TransactionCategory,
  profile: SpouseProfile,
  userId: string
): Promise<CategorizationRule> {
  const { data, error } = await supabase.from("categorization_rules").insert({
    keyword: keyword.toLowerCase(),
    category,
    profile,
    user_id: userId,
  }).select().single();
  if (error) throw error;
  return {
    id: data.id,
    keyword: data.keyword,
    category: data.category as TransactionCategory,
    profile: data.profile as SpouseProfile,
    userId: data.user_id,
  };
}

export function matchRule(
  description: string,
  rules: CategorizationRule[]
): CategorizationRule | null {
  const desc = description.toLowerCase();
  for (const rule of rules) {
    if (rule.keyword && desc.includes(rule.keyword)) {
      return rule;
    }
  }
  return null;
}

// ── Column mapping persistence ──
const COLUMN_MAP_KEY = "moni_csv_column_mapping";

export interface ColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol: number;
  sourceHint: string;
}

export function saveColumnMapping(mapping: ColumnMapping): void {
  localStorage.setItem(COLUMN_MAP_KEY, JSON.stringify(mapping));
}

export function loadColumnMapping(): ColumnMapping | null {
  try {
    const raw = localStorage.getItem(COLUMN_MAP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
