/**
 * Dashboard layout persistence — saves/loads grid layout per user.
 * Uses Supabase in production, localStorage in Mock Mode.
 */
import type { LayoutItem } from "react-grid-layout";
import { supabase } from "./supabase";

const LAYOUT_STORAGE_KEY = "moni_dashboard_layout";

// ── Default layout ──
export const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: "cashflow",       x: 0, y: 0,  w: 12, h: 5, minW: 6, minH: 4 },
  { i: "saldo",          x: 0, y: 5,  w: 4,  h: 4, minW: 3, minH: 3 },
  { i: "disney",         x: 4, y: 5,  w: 4,  h: 4, minW: 3, minH: 3 },
  { i: "miguel",         x: 8, y: 5,  w: 4,  h: 4, minW: 3, minH: 3 },
  { i: "liberdade",      x: 0, y: 9,  w: 4,  h: 4, minW: 3, minH: 3 },
  { i: "entretenimento", x: 4, y: 9,  w: 4,  h: 4, minW: 3, minH: 3 },
  { i: "eficiencia",     x: 8, y: 9,  w: 4,  h: 4, minW: 3, minH: 3 },
  { i: "dolar",          x: 0, y: 13, w: 4,  h: 4, minW: 3, minH: 3 },
  { i: "pie",            x: 4, y: 13, w: 8,  h: 5, minW: 4, minH: 4 },
  { i: "top",            x: 0, y: 18, w: 12, h: 5, minW: 6, minH: 4 },
];

// ── Ideal "organized" layout ──
export const IDEAL_LAYOUT: LayoutItem[] = [
  { i: "cashflow",       x: 0,  y: 0,  w: 12, h: 7,  minW: 6, minH: 5 },
  { i: "saldo",          x: 0,  y: 7,  w: 4,  h: 5,  minW: 3, minH: 4 },
  { i: "disney",         x: 4,  y: 7,  w: 4,  h: 5,  minW: 3, minH: 4 },
  { i: "miguel",         x: 8,  y: 7,  w: 4,  h: 5,  minW: 3, minH: 4 },
  { i: "liberdade",      x: 0,  y: 12, w: 4,  h: 7,  minW: 3, minH: 5 },
  { i: "entretenimento", x: 4,  y: 12, w: 4,  h: 7,  minW: 3, minH: 5 },
  { i: "eficiencia",     x: 8,  y: 12, w: 4,  h: 5,  minW: 3, minH: 4 },
  { i: "dolar",          x: 8,  y: 17, w: 4,  h: 5,  minW: 3, minH: 4 },
  { i: "pie",            x: 0,  y: 19, w: 6,  h: 6,  minW: 4, minH: 5 },
  { i: "top",            x: 6,  y: 19, w: 6,  h: 6,  minW: 4, minH: 5 },
];

// ── localStorage helpers (Mock Mode) ──
export function loadLayoutFromStorage(): LayoutItem[] | null {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LayoutItem[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLayoutToStorage(layouts: LayoutItem[]): void {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
}

export function clearLayoutStorage(): void {
  localStorage.removeItem(LAYOUT_STORAGE_KEY);
}

// ── Supabase helpers ──
let prefRecordId: string | null = null;

export async function loadLayoutFromPB(userId: string): Promise<LayoutItem[] | null> {
  try {
    const { data } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user", userId)
      .maybeSingle();
    if (!data) return null;
    prefRecordId = data.id;
    const layout = data.dashboard_layout;
    if (layout && Array.isArray(layout) && layout.length > 0) {
      return layout as LayoutItem[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveLayoutToPB(userId: string, layouts: LayoutItem[]): Promise<void> {
  try {
    if (prefRecordId) {
      await supabase.from("user_preferences").update({ dashboard_layout: layouts }).eq("id", prefRecordId);
    } else {
      const { data } = await supabase.from("user_preferences").insert({
        user: userId,
        dashboard_layout: layouts,
      }).select().single();
      if (data) prefRecordId = data.id;
    }
  } catch (err) {
    console.warn("[Moni] Failed to save layout:", err);
  }
}

export async function resetLayoutInPB(userId: string): Promise<void> {
  try {
    if (prefRecordId) {
      await supabase.from("user_preferences").update({ dashboard_layout: null }).eq("id", prefRecordId);
    }
  } catch (err) {
    console.warn("[Moni] Failed to reset layout:", err);
  }
}
