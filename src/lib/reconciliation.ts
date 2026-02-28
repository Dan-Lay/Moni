import { supabase } from "./supabase";
import { Transaction, ReconciliationStatus } from "./types";
import { mapTransaction } from "./pocketbase";

/**
 * Normalise description for matching: collapse whitespace, lowercase, trim.
 */
function normaliseDesc(desc: string): string {
  return desc.replace(/\s{2,}/g, " ").trim().toLowerCase();
}

export interface ReconciliationResult {
  /** Action taken */
  action: "skip_duplicate" | "reconciled_manual" | "new";
  /** Reconciliation status to assign */
  status: ReconciliationStatus;
  /** If an existing transaction was matched, its id */
  matchedId?: string;
  /** The (possibly updated) transaction to use */
  transaction: Transaction;
}

/**
 * For a single upload row, check Supabase for existing matches
 * within ±3 days with the same description.
 *
 * Cenário A: existing source = upload  → skip (duplicate)
 * Cenário B: existing source ≠ upload  → update amount, mark reconciled
 * Cenário C: no match                  → insert as new
 */
export async function reconcileTransaction(
  tx: Transaction,
  userId: string,
): Promise<ReconciliationResult> {
  const txDate = new Date(tx.date);
  const dateFrom = new Date(txDate);
  dateFrom.setDate(dateFrom.getDate() - 3);
  const dateTo = new Date(txDate);
  dateTo.setDate(dateTo.getDate() + 3);

  const dateFromStr = dateFrom.toISOString().split("T")[0];
  const dateToStr = dateTo.toISOString().split("T")[0];

  const normDesc = normaliseDesc(tx.description);

  // Query existing transactions in the date window
  const { data: matches, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", dateFromStr)
    .lte("date", dateToStr);

  if (error) {
    console.warn("[Reconciliation] Query error, treating as new:", error.message);
    return {
      action: "new",
      status: "novo",
      transaction: { ...tx, reconciliationStatus: "novo" } as Transaction,
    };
  }

  // Find a match by normalised description
  const matched = (matches || []).find((row) => {
    const existingDesc = normaliseDesc(row.description || "");
    return existingDesc === normDesc;
  });

  if (!matched) {
    // Cenário C — new record
    return {
      action: "new",
      status: "novo",
      transaction: { ...tx, reconciliationStatus: "novo" } as Transaction,
    };
  }

  // Check source of existing record
  const existingSource = (matched.source || "").toLowerCase();
  const isFromUpload = ["santander", "bradesco", "nubank", "unknown"].includes(existingSource)
    ? (matched.reconciliation_status === "novo" || matched.reconciliation_status === "ja_conciliado")
    : false;

  if (isFromUpload) {
    // Cenário A — duplicate from a previous upload
    // Update the existing record's status to "ja_conciliado"
    await supabase
      .from("transactions")
      .update({ reconciliation_status: "ja_conciliado", is_confirmed: true })
      .eq("id", matched.id);

    return {
      action: "skip_duplicate",
      status: "ja_conciliado",
      matchedId: matched.id,
      transaction: mapTransaction({ ...matched, reconciliation_status: "ja_conciliado", is_confirmed: true }),
    };
  }

  // Cenário B — reconcile with a manual/planned entry
  // The upload value prevails
  const { data: updated, error: updateErr } = await supabase
    .from("transactions")
    .update({
      amount: tx.amount,
      reconciliation_status: "conciliado_auto",
      is_confirmed: true,
    })
    .eq("id", matched.id)
    .select()
    .single();

  if (updateErr) {
    console.warn("[Reconciliation] Update error:", updateErr.message);
    return {
      action: "new",
      status: "novo",
      transaction: { ...tx, reconciliationStatus: "novo" } as Transaction,
    };
  }

  return {
    action: "reconciled_manual",
    status: "conciliado_auto",
    matchedId: matched.id,
    transaction: mapTransaction(updated),
  };
}

/**
 * Batch reconciliation for multiple transactions.
 * Processes sequentially to avoid race conditions on matching.
 */
export async function reconcileBatch(
  txs: Transaction[],
  userId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{
  toInsert: Transaction[];
  duplicates: number;
  reconciled: number;
  results: ReconciliationResult[];
}> {
  const results: ReconciliationResult[] = [];
  const toInsert: Transaction[] = [];
  let duplicates = 0;
  let reconciled = 0;

  for (let i = 0; i < txs.length; i++) {
    const result = await reconcileTransaction(txs[i], userId);
    results.push(result);

    switch (result.action) {
      case "skip_duplicate":
        duplicates++;
        break;
      case "reconciled_manual":
        reconciled++;
        break;
      case "new":
        toInsert.push(result.transaction);
        break;
    }

    onProgress?.(i + 1, txs.length);
  }

  return { toInsert, duplicates, reconciled, results };
}
