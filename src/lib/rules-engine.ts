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
  familyId: string | null;
}

export async function fetchCategorizationRules(
  userId: string,
  familyId?: string | null
): Promise<CategorizationRule[]> {
  try {
    let query = supabase.from("categorization_rules").select("*");

    if (familyId) {
      // Fetch rules for user OR family
      query = query.or(`user_id.eq.${userId},family_id.eq.${familyId}`);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((r) => ({
      id: r.id,
      keyword: (r.keyword || "").toLowerCase(),
      category: (r.category || "outros") as TransactionCategory,
      profile: (r.profile || "familia") as SpouseProfile,
      userId: r.user_id || "",
      familyId: r.family_id || null,
    }));
  } catch {
    return [];
  }
}

export async function createCategorizationRule(
  keyword: string,
  category: TransactionCategory,
  profile: SpouseProfile,
  userId: string,
  familyId?: string | null
): Promise<CategorizationRule> {
  const row: Record<string, unknown> = {
    keyword: keyword.toLowerCase(),
    category,
    profile,
    user_id: userId,
  };
  if (familyId) row.family_id = familyId;

  const { data, error } = await supabase
    .from("categorization_rules")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    keyword: data.keyword,
    category: data.category as TransactionCategory,
    profile: data.profile as SpouseProfile,
    userId: data.user_id,
    familyId: data.family_id || null,
  };
}

/**
 * Upsert a rule by keyword+family_id to avoid duplicates.
 * If no familyId, falls back to keyword+user_id.
 */
export async function upsertCategorizationRule(
  keyword: string,
  category: TransactionCategory,
  profile: SpouseProfile,
  userId: string,
  familyId?: string | null
): Promise<void> {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return;

  try {
    // Check if rule already exists
    let query = supabase
      .from("categorization_rules")
      .select("id")
      .eq("keyword", kw);

    if (familyId) {
      query = query.eq("family_id", familyId);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      // Update existing rule
      await supabase
        .from("categorization_rules")
        .update({ category, profile })
        .eq("id", existing.id);
    } else {
      // Create new
      await createCategorizationRule(kw, category, profile, userId, familyId);
    }
  } catch (err) {
    console.warn("[Moni] upsert rule failed:", err);
  }
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
