/**
 * Categorization Rules Engine — fetches rules once, matches in-memory
 * Optimized for low-end hardware (single fetch, array scan)
 */
import { pb } from "./pocketbase";
import { TransactionCategory, SpouseProfile } from "./types";

export interface CategorizationRule {
  id: string;
  keyword: string;
  category: TransactionCategory;
  profile: SpouseProfile;
  userId: string;
}

// ── Fetch all rules for user (single query, cached in caller) ──
export async function fetchCategorizationRules(userId: string): Promise<CategorizationRule[]> {
  try {
    const records = await pb.collection("categorization_rules").getFullList({
      filter: `user = "${userId}"`,
    });
    return records.map((r) => ({
      id: r.id,
      keyword: (r["keyword"] || "").toLowerCase(),
      category: (r["category"] || "outros") as TransactionCategory,
      profile: (r["profile"] || "familia") as SpouseProfile,
      userId: r["user"] || "",
    }));
  } catch {
    // Collection might not exist yet — return empty
    return [];
  }
}

// ── Create a new rule in PocketBase ──
export async function createCategorizationRule(
  keyword: string,
  category: TransactionCategory,
  profile: SpouseProfile,
  userId: string
): Promise<CategorizationRule> {
  const r = await pb.collection("categorization_rules").create({
    keyword: keyword.toLowerCase(),
    category,
    profile,
    user: userId,
  });
  return {
    id: r.id,
    keyword: r["keyword"],
    category: r["category"] as TransactionCategory,
    profile: r["profile"] as SpouseProfile,
    userId: r["user"],
  };
}

// ── Match a description against all rules (case-insensitive contains) ──
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
