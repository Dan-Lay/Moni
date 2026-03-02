import { AppLayout } from "@/components/layout/AppLayout";
import {
  Upload as UploadIcon, FileText, FileSpreadsheet, CheckCircle, AlertCircle,
  Plane, Link2, Loader2, Sparkles, Plus, ChevronDown, EyeOff, Eye,
  GitMerge, Copy, FileUp, ChevronsUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState, useEffect } from "react";
import { parseOFX } from "@/lib/parsers";
import { useFinance } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction, TransactionCategory, CATEGORY_LABELS, formatMiles, formatBRL, SpouseProfile, ReconciliationStatus, RECONCILIATION_LABELS, INVESTMENT_SUBCATEGORY_LABELS, InvestmentSubcategory } from "@/lib/types";
import { tryReconcile } from "@/lib/storage";
import { buildTransaction, categorizeTransaction } from "@/lib/categorizer";
import { reconcileBatch, ReconciliationResult } from "@/lib/reconciliation";
import {
  CategorizationRule, fetchCategorizationRules, createCategorizationRule,
  upsertCategorizationRule, matchRule, ColumnMapping, saveColumnMapping, loadColumnMapping,
} from "@/lib/rules-engine";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";



// ── Types for review rows ──
interface ReviewRow {
  tx: Transaction;
  ruleMatch: CategorizationRule | null;
  status: "auto" | "pending";
  ignored: boolean;
  reconciliation?: ReconciliationResult;
}

// ── Chunked processing helper ──
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const CHUNK_SIZE = 30;

// ── Parse CSV with custom column mapping ──
function parseCSVWithMapping(
  content: string,
  mapping: ColumnMapping,
  cotacaoDolar: number
): Transaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0];
  const sep = header.includes(";") ? ";" : ",";
  const txs: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map((p) => p.trim().replace(/"/g, ""));
    if (parts.length <= Math.max(mapping.dateCol, mapping.descCol, mapping.amountCol)) continue;

    const rawDate = parts[mapping.dateCol] || "";
    const desc = parts[mapping.descCol] || "Sem descrição";
    const rawAmount = parts[mapping.amountCol] || "0";

    const date = normalizeDate(rawDate);
    const amount = parseAmount(rawAmount);
    if (!date || isNaN(amount)) continue;

    txs.push(buildTransaction(date, desc, amount, mapping.sourceHint, cotacaoDolar));
  }
  return txs;
}

function normalizeDate(raw: string): string {
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const ymd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  return raw;
}

function parseAmount(raw: string): number {
  let cleaned = raw.replace(/\s/g, "");
  if (/\d\.\d{3},/.test(cleaned)) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  else if (/,\d{2}$/.test(cleaned)) cleaned = cleaned.replace(",", ".");
  return parseFloat(cleaned);
}

const UploadPage = () => {
  const { addTransactions, data, reload, updatePlannedEntry } = useFinance();
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [sourceHint, setSourceHint] = useState("santander");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── Column mapping state ──
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [dateCol, setDateCol] = useState(0);
  const [descCol, setDescCol] = useState(1);
  const [amountCol, setAmountCol] = useState(2);

  // ── Review state ──
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number; miles: number; source: string; spouseCount: number; reconciled: number; duplicates: number } | null>(null);
  const [onlyCategorized, setOnlyCategorized] = useState(false);

  // ── Create Rule dialog ──
  const [ruleDialog, setRuleDialog] = useState<{ open: boolean; rowIdx: number; keyword: string; category: TransactionCategory; profile: SpouseProfile; subcategory: string }>({
    open: false, rowIdx: -1, keyword: "", category: "outros", profile: "familia", subcategory: "",
  });

  // Load saved mapping on mount
  useEffect(() => {
    const saved = loadColumnMapping();
    if (saved) {
      setDateCol(saved.dateCol);
      setDescCol(saved.descCol);
      setAmountCol(saved.amountCol);
      setSourceHint(saved.sourceHint);
    }
  }, []);

  // Load rules on mount
  useEffect(() => {
    if (user?.id) {
      fetchCategorizationRules(user.id, user.familyId).then(setRules).catch(() => {});
    }
  }, [user?.id, user?.familyId]);

  // ── File processing ──
  const processFile = useCallback(async (file: File) => {
    setError(null);
    setImportSummary(null);
    setShowReview(false);
    setReviewRows([]);

    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const cotacaoDolar = data.config.cotacaoDolar;

    if (ext === "ofx" || ext === "qfx") {
      // OFX: process directly (no column mapping needed)
      setIsLoading(true);
      setLoadingMsg("Lendo arquivo OFX...");
      try {
        const txs = parseOFX(text, sourceHint, cotacaoDolar);
        if (txs.length === 0) { setError("Nenhuma transação encontrada."); setIsLoading(false); return; }
        await processTransactionsWithRules(txs, file.name);
      } catch { setError("Erro ao processar OFX."); }
      setIsLoading(false);
    } else if (ext === "csv" || ext === "txt") {
      // CSV: show column mapping UI
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { setError("Arquivo vazio."); return; }
      const sep = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(sep).map((h) => h.trim().replace(/"/g, ""));
      setCsvHeaders(headers);
      setCsvContent(text);

      // Try auto-detect columns
      const headerLower = headers.map((h) => h.toLowerCase());
      const di = headerLower.findIndex((c) => /data|date/.test(c));
      const ai = headerLower.findIndex((c) => /valor|amount|value/.test(c));
      const dsi = headerLower.findIndex((c) => /descri|description|historico|memo|name/.test(c));
      if (di >= 0) setDateCol(di);
      if (dsi >= 0) setDescCol(dsi);
      if (ai >= 0) setAmountCol(ai);

      setShowMapping(true);
    } else if (ext === "pdf") {
      setError("Suporte a PDF em desenvolvimento. Por enquanto, exporte a fatura como CSV ou OFX no app do seu banco.");
    } else {
      setError(`Formato .${ext} não suportado. Use OFX, CSV ou PDF.`);
    }
  }, [sourceHint, data.config.cotacaoDolar]);

  // ── Apply column mapping and process CSV ──
  const handleConfirmMapping = useCallback(async () => {
    if (!csvContent) return;
    setShowMapping(false);
    setIsLoading(true);
    setLoadingMsg("Processando CSV e aplicando regras...");

    // Save mapping for future uploads
    const mapping: ColumnMapping = { dateCol, descCol, amountCol, sourceHint };
    saveColumnMapping(mapping);

    try {
      const txs = parseCSVWithMapping(csvContent, mapping, data.config.cotacaoDolar);
      if (txs.length === 0) { setError("Nenhuma transação encontrada."); setIsLoading(false); return; }
      await processTransactionsWithRules(txs, "CSV Import");
    } catch { setError("Erro ao processar CSV."); }
    setIsLoading(false);
  }, [csvContent, dateCol, descCol, amountCol, sourceHint, data.config.cotacaoDolar]);

  // ── Core: process transactions with rule engine + bank reconciliation ──
  const processTransactionsWithRules = useCallback(async (txs: Transaction[], fileName: string) => {
    setLoadingMsg("Buscando regras de categorização...");
    console.time("[Moni] upload-total");

    // Fetch latest rules with timeout so a slow network doesn't hang the upload
    let currentRules = rules;
    if (user?.id) {
      console.time("[Moni] fetch-rules");
      try {
        const rulesPromise = fetchCategorizationRules(user.id, user.familyId);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 5000)
        );
        currentRules = await Promise.race([rulesPromise, timeoutPromise]);
        setRules(currentRules);
      } catch {
        // Use cached rules if fetch fails or times out
      }
      console.timeEnd("[Moni] fetch-rules");
    }

    // Process in chunks — always yield to keep UI responsive
    console.time("[Moni] categorize");
    const rows: ReviewRow[] = [];
    for (let i = 0; i < txs.length; i += CHUNK_SIZE) {
      const chunk = txs.slice(i, i + CHUNK_SIZE);
      for (const tx of chunk) {
        const ruleMatch = matchRule(tx.description, currentRules);
        if (ruleMatch) {
          rows.push({
            tx: { ...tx, category: ruleMatch.category, spouseProfile: ruleMatch.profile, subcategory: (ruleMatch.subcategory as any) || undefined },
            ruleMatch,
            status: "auto",
            ignored: false,
          });
        } else {
          const builtinCat = categorizeTransaction(tx.description);
          rows.push({ tx, ruleMatch: null, status: builtinCat !== "outros" ? "auto" : "pending", ignored: false });
        }
      }
      const done = Math.min(i + CHUNK_SIZE, txs.length);
      setLoadingMsg(`Categorizando... ${done} de ${txs.length}`);
      await sleep(0);
    }
    console.timeEnd("[Moni] categorize");

    // Reconciliation is deferred to confirm-time — skip here during preview

    const spouseCount = rows.filter((r) => r.tx.isAdditionalCard).length;
    const totalMiles = rows.reduce((a, r) => a + r.tx.milesGenerated, 0);

    setImportSummary({
      count: rows.length,
      miles: totalMiles,
      source: fileName,
      spouseCount,
      reconciled: 0,
      duplicates: 0,
    });

    setReviewRows(rows);
    setShowReview(true);
    console.timeEnd("[Moni] upload-total");
  }, [rules, user?.id, data.config.cotacaoDolar]);

  // ── Confirm import ──
  const handleConfirmImport = useCallback(async () => {
    setIsLoading(true);

    // Filter rows eligible for import
    const eligible = reviewRows.filter((r) => {
      if (r.ignored) return false;
      if (onlyCategorized && r.status !== "auto") return false;
      return true;
    });
    const txs = eligible.map((r) => r.tx);

    if (txs.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      // ── Run reconciliation NOW (at confirm-time) ──
      let toInsertTxs = txs;

      if (user?.id) {
        setLoadingMsg("Conciliando com base de dados...");
        const { toInsert, duplicates, reconciled: reconciledBank } = await reconcileBatch(
          txs,
          user.id,
          (done, total) => setLoadingMsg(`Conciliando... ${done} de ${total}`),
        );
        toInsertTxs = toInsert;

        // ── Planned entries reconciliation ──
        setLoadingMsg("Conciliando com lançamentos previstos...");
        const planned = data.plannedEntries ?? [];
        const reconcileJobs: Promise<boolean>[] = [];
        for (const tx of toInsertTxs) {
          const matchId = tryReconcile(tx, planned);
          if (matchId) {
            reconcileJobs.push(
              updatePlannedEntry(matchId, { conciliado: true, realAmount: Math.abs(tx.amount) as any })
                .then(() => true)
                .catch(() => false)
            );
          }
        }
        await Promise.allSettled(reconcileJobs);

        if (duplicates > 0 || reconciledBank > 0) {
          setImportSummary((prev) => prev ? { ...prev, duplicates, reconciled: reconciledBank } : prev);
        }
      }

      // ── Insert only truly new transactions ──
      if (toInsertTxs.length > 0) {
        setLoadingMsg(`Salvando ${toInsertTxs.length} transações...`);
        await addTransactions(toInsertTxs);
      }

      // ── Learning: upsert rules for manually changed categories ──
      if (user?.id) {
        const changedRows = eligible.filter((r) => {
          // If user changed the category from what the categorizer originally set
          const originalCat = r.ruleMatch ? r.ruleMatch.category : categorizeTransaction(r.tx.description);
          return r.tx.category !== originalCat;
        });
        for (const r of changedRows) {
          const keyword = r.tx.description;
          upsertCategorizationRule(keyword, r.tx.category, r.tx.spouseProfile, user.id, user.familyId, (r.tx as any).subcategory);
        }
      }

      setShowReview(false);
      setReviewRows([]);
      setOnlyCategorized(false);
      reload();
    } catch {
      setError("Erro ao salvar transações. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [reviewRows, addTransactions, onlyCategorized, user?.id, data.plannedEntries, updatePlannedEntry, reload]);

  // ── Create rule dialog actions ──
  const openCreateRule = (rowIdx: number) => {
    const row = reviewRows[rowIdx];
    const words = row.tx.establishment || row.tx.description;
    setRuleDialog({
      open: true,
      rowIdx,
      keyword: words.toLowerCase(),
      category: row.tx.category,
      profile: row.tx.spouseProfile,
      subcategory: (row.tx as any).subcategory || "",
    });
  };

  const handleSaveRule = useCallback(async () => {
    if (!user?.id || !ruleDialog.keyword.trim()) return;
    setRuleDialog((d) => ({ ...d, open: false }));
    setIsLoading(true);
    setLoadingMsg("Criando regra e reaplicando...");

    try {
      const newRule = await createCategorizationRule(
        ruleDialog.keyword.trim(),
        ruleDialog.category,
        ruleDialog.profile,
        user.id,
        user.familyId,
        ruleDialog.subcategory || undefined
      );
      const updatedRules = [...rules, newRule];
      setRules(updatedRules);

      // Re-apply new rule to all pending rows
      setReviewRows((prev) =>
        prev.map((row) => {
          if (row.status === "pending") {
            const match = matchRule(row.tx.description, [newRule]);
            if (match) {
              return {
                ...row,
                tx: { ...row.tx, category: match.category, spouseProfile: match.profile, subcategory: (match.subcategory as any) || undefined },
                ruleMatch: match,
                status: "auto" as const,
              };
            }
          }
          return row;
        })
      );
    } catch {
      setError("Erro ao salvar regra.");
    }
    setIsLoading(false);
  }, [ruleDialog, user?.id, rules]);

  // ── Manual category change on a row ──
  const handleCategoryChange = (rowIdx: number, category: TransactionCategory) => {
    setReviewRows((prev) =>
      prev.map((r, i) =>
        i === rowIdx ? { ...r, tx: { ...r.tx, category, subcategory: category !== 'investimentos' ? undefined : r.tx.subcategory }, status: "auto" as const } : r
      )
    );
  };

  const handleSubcategoryChange = (rowIdx: number, subcategory: string) => {
    setReviewRows((prev) =>
      prev.map((r, i) =>
        i === rowIdx ? { ...r, tx: { ...r.tx, subcategory: (subcategory || undefined) as any } } : r
      )
    );
  };

  const handleToggleIgnore = (rowIdx: number) => {
    setReviewRows((prev) =>
      prev.map((r, i) =>
        i === rowIdx ? { ...r, ignored: !r.ignored } : r
      )
    );
  };

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }, [processFile]);




  const pendingCount = reviewRows.filter((r) => r.status === "pending" && !r.ignored).length;
  const autoCount = reviewRows.filter((r) => r.status === "auto" && !r.ignored).length;
  const ignoredCount = reviewRows.filter((r) => r.ignored).length;
  const duplicateCount = reviewRows.filter((r) => r.reconciliation?.action === "skip_duplicate").length;
  const reconciledAutoCount = reviewRows.filter((r) => r.reconciliation?.action === "reconciled_manual").length;
  const newCount = reviewRows.filter((r) => r.reconciliation?.action === "new" && !r.ignored).length;
  const importableCount = onlyCategorized ? autoCount : (reviewRows.filter((r) => !r.ignored && r.reconciliation?.action !== "skip_duplicate" && r.reconciliation?.action !== "reconciled_manual").length);

  return (
    <AppLayout>
      <h1 className="mb-4 text-xl font-bold">Upload de Extratos</h1>
      <p className="mb-6 text-sm text-muted-foreground">Processamento 100% local — seus dados nunca saem do navegador.</p>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">{loadingMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank selector */}
      {!showReview && !showMapping && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Banco:</span>
            {["santander", "bradesco", "nubank"].map((s) => (
              <button key={s} onClick={() => setSourceHint(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${sourceHint === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
          {/* Drop zone */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
            className={`glass-card flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><UploadIcon className="h-7 w-7 text-primary" /></div>
            <h2 className="mb-1 text-lg font-semibold">Arraste seus arquivos aqui</h2>
            <p className="mb-4 text-sm text-muted-foreground">Ou selecione pelo tipo de arquivo:</p>
             <div className="flex flex-wrap gap-3 justify-center">
               <label className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" /> Importar Extrato CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
                </label>
                <label className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 cursor-pointer">
                  <FileText className="h-4 w-4" /> Importar Extrato OFX
                  <input type="file" accept=".ofx,.qfx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
                </label>
                <label className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 cursor-pointer">
                  <FileText className="h-4 w-4" /> Importar Fatura PDF
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
                </label>
             </div>
           </motion.div>

          {/* Format info */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: FileText, label: "OFX / QFX", desc: "Extrato bancário — parsing de STMTTRN" },
              { icon: FileSpreadsheet, label: "CSV / TXT", desc: "Mapeamento de colunas personalizável" },
              { icon: FileText, label: "PDF", desc: "Faturas de cartão (em breve)" },
            ].map((item) => (
              <div key={item.label} className="glass-card flex items-center gap-3 rounded-xl p-4">
                <item.icon className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-semibold">{item.label}</p><p className="text-[11px] text-muted-foreground">{item.desc}</p></div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Column Mapping UI ── */}
      {showMapping && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold">Mapeamento de Colunas</h2>
          <p className="mb-4 text-xs text-muted-foreground">Selecione quais colunas correspondem a cada campo. Será salvo para futuras importações.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Data", value: dateCol, setter: setDateCol },
              { label: "Descrição", value: descCol, setter: setDescCol },
              { label: "Valor", value: amountCol, setter: setAmountCol },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
                <div className="relative">
                  <select
                    value={value}
                    onChange={(e) => setter(Number(e.target.value))}
                    className="w-full appearance-none rounded-lg border border-border bg-popover px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {csvHeaders.map((h, i) => (
                      <option key={i} value={i}>{h} (col {i})</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleConfirmMapping} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Processar
            </button>
            <button onClick={() => { setShowMapping(false); setCsvContent(null); }} className="rounded-xl bg-secondary px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Review Interface ── */}
      {showReview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Summary bar */}
          {importSummary && (
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">Arquivo processado — revise antes de importar</p>
                  <p className="mt-1 text-xs text-muted-foreground">{importSummary.source}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-secondary/50 px-3 py-2">
                      <p className="font-mono text-lg font-bold">{importSummary.count}</p>
                      <p className="text-[10px] text-muted-foreground">transações</p>
                    </div>
                    <div className="rounded-lg bg-accent/10 px-3 py-2">
                      <div className="flex items-center gap-1"><Plane className="h-3 w-3 text-accent" /><p className="font-mono text-lg font-bold text-accent">{formatMiles(importSummary.miles)}</p></div>
                      <p className="text-[10px] text-muted-foreground">milhas AA</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 px-3 py-2">
                      <div className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /><p className="font-mono text-lg font-bold text-primary">{autoCount}</p></div>
                      <p className="text-[10px] text-muted-foreground">auto-categorizados</p>
                    </div>
                    <div className="rounded-lg bg-destructive/10 px-3 py-2">
                      <p className="font-mono text-lg font-bold text-destructive">{pendingCount}</p>
                      <p className="text-[10px] text-muted-foreground">pendentes</p>
                    </div>
                  </div>
                  {/* Reconciliation stats */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {importSummary.duplicates > 0 && (
                      <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">
                        <Copy className="h-2.5 w-2.5 mr-1" /> {importSummary.duplicates} duplicado(s)
                      </Badge>
                    )}
                    {importSummary.reconciled > 0 && (
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                        <GitMerge className="h-2.5 w-2.5 mr-1" /> {importSummary.reconciled} conciliado(s)
                      </Badge>
                    )}
                    {newCount > 0 && (
                      <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-400">
                        <FileUp className="h-2.5 w-2.5 mr-1" /> {newCount} novo(s)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction list */}
          <div className="glass-card rounded-2xl p-4 w-full mt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Transações ({reviewRows.length}){ignoredCount > 0 && <span className="text-muted-foreground font-normal"> · {ignoredCount} ignorada(s)</span>}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={onlyCategorized} onChange={(e) => setOnlyCategorized(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary" />
                  <span className="text-[11px] text-muted-foreground">Categorizado</span>
                </label>
                <button onClick={() => { setShowReview(false); setReviewRows([]); setImportSummary(null); setOnlyCategorized(false); }}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
                <button onClick={handleConfirmImport}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  Importar {importableCount} transações
                </button>
              </div>
            </div>
            {(() => {
              const isReconciled = (r: ReviewRow) =>
                r.reconciliation?.action === "skip_duplicate" || r.reconciliation?.action === "reconciled_manual";
              const mainRows = reviewRows.map((r, i) => ({ row: r, idx: i })).filter(({ row }) => !isReconciled(row));
              const reconciledRows = reviewRows.map((r, i) => ({ row: r, idx: i })).filter(({ row }) => isReconciled(row));

              const renderRow = ({ row, idx }: { row: ReviewRow; idx: number }) => {
                if (onlyCategorized && row.status === "pending") return null;
                const reconcAction = row.reconciliation?.action;
                const reconcBadge = reconcAction === "skip_duplicate"
                  ? { label: "Já Conciliado", cls: "border-muted-foreground/40 text-muted-foreground bg-muted/30" }
                  : reconcAction === "reconciled_manual"
                  ? { label: "Conciliado Auto", cls: "border-primary/40 text-primary bg-primary/10" }
                  : reconcAction === "new"
                  ? { label: "Novo (Upload)", cls: "border-blue-500/40 text-blue-400 bg-blue-500/10" }
                  : null;

                return (
                  <div key={`${row.tx.id}_${idx}`} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs transition-opacity ${row.ignored ? "opacity-40" : ""} ${row.status === "pending" && !row.ignored ? "bg-destructive/5" : "bg-secondary/30"}`}>
                    <button onClick={() => handleToggleIgnore(idx)} title={row.ignored ? "Restaurar" : "Ignorar"}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                      {row.ignored ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <span className="w-20 shrink-0 text-muted-foreground mt-0.5">{row.tx.date}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium break-words ${row.ignored ? "line-through" : ""}`} title={row.tx.description}>
                        {row.tx.treatedName || row.tx.description}
                      </p>
                      {reconcBadge && (
                        <Badge variant="outline" className={`mt-1 text-[9px] px-1.5 py-0 h-4 ${reconcBadge.cls}`}>
                          {reconcAction === "skip_duplicate" && <Copy className="h-2 w-2 mr-0.5" />}
                          {reconcAction === "reconciled_manual" && <GitMerge className="h-2 w-2 mr-0.5" />}
                          {reconcAction === "new" && <FileUp className="h-2 w-2 mr-0.5" />}
                          {reconcBadge.label}
                        </Badge>
                      )}
                    </div>
                    <span className={`w-24 shrink-0 text-right font-mono font-semibold mt-0.5 ${row.tx.amount < 0 ? "text-destructive" : "text-primary"}`}>
                      {formatBRL(row.tx.amount)}
                    </span>
                    <div className="relative w-28 shrink-0">
                      <select
                        value={row.tx.category}
                        onChange={(e) => handleCategoryChange(idx, e.target.value as TransactionCategory)}
                        disabled={row.ignored || reconcAction === "skip_duplicate"}
                        className={`w-full appearance-none rounded-md border px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${
                          row.status === "pending" && !row.ignored
                            ? "border-destructive/30 bg-destructive/5 text-destructive"
                            : "border-border bg-popover text-foreground"
                        }`}
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    {row.tx.category === 'investimentos' && !row.ignored && reconcAction !== "skip_duplicate" && (
                      <div className="relative w-24 shrink-0">
                        <select
                          value={(row.tx as any).subcategory || ""}
                          onChange={(e) => handleSubcategoryChange(idx, e.target.value)}
                          className="w-full appearance-none rounded-md border border-border bg-popover px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Sub...</option>
                          {Object.entries(INVESTMENT_SUBCATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    )}
                    {row.status === "pending" && !row.ignored && reconcAction !== "skip_duplicate" ? (
                      <button onClick={() => openCreateRule(idx)} title="Criar regra"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                        {!row.ignored && reconcAction !== "skip_duplicate" && <Sparkles className="h-3 w-3 text-primary/50" />}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div className="block w-full max-h-[55vh] overflow-y-auto mt-4 pr-2 space-y-1">
                    {mainRows.map(renderRow)}
                    {reconciledRows.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 transition-colors">
                          <ChevronsUpDown className="h-3.5 w-3.5" />
                          <span>{reconciledRows.length} lançamento(s) já conciliado(s) — clique para ver</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 mt-1">
                          {reconciledRows.map(renderRow)}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" /><p className="text-sm text-destructive">{error}</p></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Rule Dialog ── */}
      <Dialog open={ruleDialog.open} onOpenChange={(o) => setRuleDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Regra de Categorização</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Palavra-chave</label>
              <input
                type="text"
                value={ruleDialog.keyword}
                onChange={(e) => setRuleDialog((d) => ({ ...d, keyword: e.target.value }))}
                className="w-full rounded-lg border border-border bg-popover px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="ex: ifood, uber, etc."
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Transações contendo esta palavra serão categorizadas automaticamente.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</label>
              <div className="relative">
                <select
                  value={ruleDialog.category}
                  onChange={(e) => setRuleDialog((d) => ({ ...d, category: e.target.value as TransactionCategory }))}
                  className="w-full appearance-none rounded-lg border border-border bg-popover px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            {ruleDialog.category === 'investimentos' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Subcategoria</label>
                <div className="relative">
                  <select
                    value={ruleDialog.subcategory}
                    onChange={(e) => setRuleDialog((d) => ({ ...d, subcategory: e.target.value }))}
                    className="w-full appearance-none rounded-lg border border-border bg-popover px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sem subcategoria</option>
                    {Object.entries(INVESTMENT_SUBCATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Perfil</label>
              <div className="relative">
                <select
                  value={ruleDialog.profile}
                  onChange={(e) => setRuleDialog((d) => ({ ...d, profile: e.target.value as SpouseProfile }))}
                  className="w-full appearance-none rounded-lg border border-border bg-popover px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="marido">Marido</option>
                  <option value="esposa">Esposa</option>
                  <option value="familia">Família</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setRuleDialog((d) => ({ ...d, open: false }))} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button onClick={handleSaveRule} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Salvar Regra
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default UploadPage;
