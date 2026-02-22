/**
 * Category Cache — single-fetch resolver between PocketBase record IDs
 * and the app's internal text keys (TransactionCategory).
 *
 * PocketBase `categories` collection expected schema:
 *   id (auto), name (text — matches TransactionCategory key, e.g. "alimentacao"), icon, color
 *
 * Usage:
 *   await ensureCategoryCache();          // call once at startup
 *   categoryNameToId("alimentacao")       // → "pb_record_id_123"
 *   categoryIdToName("pb_record_id_123") // → "alimentacao"
 */

import { pb } from "./pocketbase";
import { TransactionCategory } from "./types";

interface CategoryRecord {
  id: string;
  name: string;       // internal key like "alimentacao"
  icon?: string;
  color?: string;
}

let nameToId: Map<string, string> | null = null;
let idToName: Map<string, string> | null = null;
let fetchPromise: Promise<void> | null = null;

/** Fetch all categories once and cache both lookup maps */
export async function ensureCategoryCache(): Promise<void> {
  if (nameToId && idToName) return;
  // Deduplicate concurrent calls
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const records = await pb.collection("categories").getFullList<CategoryRecord>();
      nameToId = new Map();
      idToName = new Map();
      for (const r of records) {
        const key = (r.name || "").toLowerCase().trim();
        if (key) {
          nameToId.set(key, r.id);
          idToName.set(r.id, key);
        }
      }
    } catch (err) {
      console.warn("[category-cache] Failed to fetch categories, falling back to text mode:", err);
      // Graceful degradation — maps stay null, functions return passthrough
      nameToId = new Map();
      idToName = new Map();
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Convert an internal category key to a PocketBase record ID.
 * Falls back to the text key itself if no mapping exists (backward compat).
 */
export function categoryNameToId(name: string): string {
  if (!nameToId) return name;
  return nameToId.get(name.toLowerCase().trim()) ?? name;
}

/**
 * Convert a PocketBase record ID (or legacy text) to an internal category key.
 * If the value looks like a PB ID (15 chars alphanumeric) and is found in the map,
 * returns the category name. Otherwise returns the value as-is (legacy text).
 */
export function categoryIdToName(idOrName: string): string {
  if (!idToName) return idOrName;
  // Check if it's a known PB ID
  const resolved = idToName.get(idOrName);
  if (resolved) return resolved;
  // It's already a text key (legacy data) — return as-is
  return idOrName;
}

/** Force re-fetch (e.g. after creating a new category) */
export function invalidateCategoryCache(): void {
  nameToId = null;
  idToName = null;
  fetchPromise = null;
}

/** Get all cached categories as {id, name} pairs */
export function getAllCachedCategories(): { id: string; name: string }[] {
  if (!idToName) return [];
  return Array.from(idToName.entries()).map(([id, name]) => ({ id, name }));
}
