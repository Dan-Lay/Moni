/**
 * Category Cache — with Supabase, categories are stored by name directly.
 * No ID indirection needed. This module is kept for backward compatibility.
 */

import { supabase } from "./supabase";

interface CategoryRecord {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

let cachedCategories: CategoryRecord[] | null = null;
let fetchPromise: Promise<void> | null = null;

export async function ensureCategoryCache(): Promise<void> {
  if (cachedCategories) return;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data } = await supabase.from("categories").select("*");
      cachedCategories = data || [];
    } catch {
      cachedCategories = [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

// With Supabase, categories are stored by name — no ID mapping needed
export function categoryNameToId(name: string): string {
  return name;
}

export function categoryIdToName(idOrName: string): string {
  return idOrName;
}

export function invalidateCategoryCache(): void {
  cachedCategories = null;
  fetchPromise = null;
}

export function getAllCachedCategories(): { id: string; name: string }[] {
  if (!cachedCategories) return [];
  return cachedCategories.map((c) => ({ id: c.id || c.name, name: c.name }));
}
