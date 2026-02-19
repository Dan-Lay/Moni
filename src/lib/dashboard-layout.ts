/**
 * Dashboard layout persistence — saves/loads grid layout per user.
 * Uses PocketBase in production, localStorage in Mock Mode.
 */
import type { LayoutItem } from "react-grid-layout";
import * as realPB from "./pocketbase";

const LAYOUT_STORAGE_KEY = "moni_dashboard_layout";
const COLLECTION_NAME = "user_preferences";

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

// ── PocketBase helpers ──
let prefRecordId: string | null = null;

export async function loadLayoutFromPB(userId: string): Promise<LayoutItem[] | null> {
  try {
    const record = await realPB.pb.collection(COLLECTION_NAME).getFirstListItem(`user = "${userId}"`);
    prefRecordId = record.id;
    const layout = record["dashboard_layout"];
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
      await realPB.pb.collection(COLLECTION_NAME).update(prefRecordId, {
        dashboard_layout: layouts,
      });
    } else {
      const record = await realPB.pb.collection(COLLECTION_NAME).create({
        user: userId,
        dashboard_layout: layouts,
      });
      prefRecordId = record.id;
    }
  } catch (err) {
    console.warn("[Moni] Failed to save layout to PB:", err);
  }
}

export async function resetLayoutInPB(userId: string): Promise<void> {
  try {
    if (prefRecordId) {
      await realPB.pb.collection(COLLECTION_NAME).update(prefRecordId, {
        dashboard_layout: null,
      });
    }
  } catch (err) {
    console.warn("[Moni] Failed to reset layout in PB:", err);
  }
}
