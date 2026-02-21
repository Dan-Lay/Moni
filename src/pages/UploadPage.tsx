import { AppLayout } from "@/components/layout/AppLayout";
import {
  Upload as UploadIcon, FileText, FileSpreadsheet, CheckCircle, AlertCircle,
  Plane, Link2, Loader2, Sparkles, Plus, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState, useEffect } from "react";
import { parseOFX } from "@/lib/parsers";
import { useFinance } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction, TransactionCategory, CATEGORY_LABELS, formatMiles, formatBRL, SpouseProfile } from "@/lib/types";
import { tryReconcile } from "@/lib/storage";
import { buildTransaction, categorizeTransaction } from "@/lib/categorizer";
import {
  CategorizationRule, fetchCategorizationRules, createCategorizationRule,
  matchRule, ColumnMapping, saveColumnMapping, loadColumnMapping,
} from "@/lib/rules-engine";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ── Types for review rows ──
interface ReviewRow {
  tx: Transaction;
  ruleMatch: CategorizationRule | null;
  status: "auto" | "pending";
}

// ── Chunked processing helper ──
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const CHUNK_SIZE = 200;

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
  const fileRef = useRef<HTMLInputElement>(null);
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
  const [importSummary, setImportSummary] = useState<{ count: number; miles: number; source: string; spouseCount: number; reconciled: number } | null>(null);

  // ── Create Rule dialog ──
  const [ruleDialog, setRuleDialog] = useState<{ open: boolean; rowIdx: number; keyword: string; category: TransactionCategory; profile: SpouseProfile }>({
    open: false, rowIdx: -1, keyword: "", category: "outros", profile: "familia",
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
      fetchCategorizationRules(user.id).then(setRules).catch(() => {});
    }
  }, [user?.id]);

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
    } else {
      setError(`Formato .${ext} não suportado. Use OFX ou CSV.`);
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

  // ── Core: process transactions with rule engine (chunked) ──
  const processTransactionsWithRules = useCallback(async (txs: Transaction[], fileName: string) => {
    setLoadingMsg("Aplicando regras de categorização...");

    // Fetch latest rules
    let currentRules = rules;
    if (user?.id) {
      try {
        currentRules = await fetchCategorizationRules(user.id);
        setRules(currentRules);
      } catch {}
    }

    // Process in chunks to avoid freezing
    const rows: ReviewRow[] = [];
    for (let i = 0; i < txs.length; i += CHUNK_SIZE) {
      const chunk = txs.slice(i, i + CHUNK_SIZE);
      for (const tx of chunk) {
        const ruleMatch = matchRule(tx.description, currentRules);
        if (ruleMatch) {
          // Apply rule: override category and profile
          const categorized: Transaction = {
            ...tx,
            category: ruleMatch.category,
            spouseProfile: ruleMatch.profile,
          };
          rows.push({ tx: categorized, ruleMatch, status: "auto" });
        } else {
          // Check built-in categorizer — if it returned something other than "outros", mark as auto
          const builtinCat = categorizeTransaction(tx.description);
          if (builtinCat !== "outros") {
            rows.push({ tx, ruleMatch: null, status: "auto" });
          } else {
            rows.push({ tx, ruleMatch: null, status: "pending" });
          }
        }
      }
      if (txs.length > CHUNK_SIZE) {
        setLoadingMsg(`Categorizando... ${Math.min(i + CHUNK_SIZE, txs.length)}/${txs.length}`);
        await sleep(0); // yield to UI thread
      }
    }

    setLoadingMsg("Conciliando com lançamentos previstos...");
    await sleep(0);

    // Reconciliation
    const planned = data.plannedEntries ?? [];
    let reconciledCount = 0;
    for (const row of rows) {
      const matchId = tryReconcile(row.tx, planned);
      if (matchId) {
        try {
          await updatePlannedEntry(matchId, { conciliado: true, realAmount: Math.abs(row.tx.amount) as any });
          reconciledCount++;
        } catch {}
      }
    }

    const spouseCount = rows.filter((r) => r.tx.isAdditionalCard).length;
    const totalMiles = rows.reduce((a, r) => a + r.tx.milesGenerated, 0);

    setImportSummary({
      count: rows.length,
      miles: totalMiles,
      source: fileName,
      spouseCount,
      reconciled: reconciledCount,
    });

    setReviewRows(rows);
    setShowReview(true);
    if (reconciledCount > 0) reload();
  }, [rules, user?.id, data.plannedEntries, updatePlannedEntry, reload]);

  // ── Confirm import ──
  const handleConfirmImport = useCallback(async () => {
    setIsLoading(true);
    setLoadingMsg("Salvando transações...");
    const txs = reviewRows.map((r) => r.tx);
    await addTransactions(txs);
    setIsLoading(false);
    setShowReview(false);
    setReviewRows([]);
  }, [reviewRows, addTransactions]);

  // ── Create rule dialog actions ──
  const openCreateRule = (rowIdx: number) => {
    const row = reviewRows[rowIdx];
    // Extract a keyword suggestion from the description
    const words = row.tx.establishment || row.tx.description;
    setRuleDialog({
      open: true,
      rowIdx,
      keyword: words.toLowerCase().substring(0, 30),
      category: row.tx.category,
      profile: row.tx.spouseProfile,
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
        user.id
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
                tx: { ...row.tx, category: match.category, spouseProfile: match.profile },
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
        i === rowIdx ? { ...r, tx: { ...r.tx, category }, status: "auto" as const } : r
      )
    );
  };

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }, [processFile]);
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); }, [processFile]);

  const pendingCount = reviewRows.filter((r) => r.status === "pending").length;
  const autoCount = reviewRows.filter((r) => r.status === "auto").length;

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
            <p className="mb-6 text-sm text-muted-foreground">OFX e CSV suportados</p>
            <input ref={fileRef} type="file" accept=".ofx,.qfx,.csv,.txt" className="hidden" onChange={handleChange} />
            <button onClick={() => fileRef.current?.click()} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">Selecionar Arquivo</button>
          </motion.div>

          {/* Format info */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[{ icon: FileText, label: "OFX / QFX", desc: "Extrato bancário — parsing de STMTTRN" }, { icon: FileSpreadsheet, label: "CSV / TXT", desc: "Mapeamento de colunas personalizável" }].map((item) => (
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
                  {importSummary.reconciled > 0 && (
                    <p className="mt-2 text-[11px] text-primary">✓ {importSummary.reconciled} conciliado(s) com lançamentos previstos</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transaction list */}
          <div className="glass-card rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Transações ({reviewRows.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => { setShowReview(false); setReviewRows([]); setImportSummary(null); }}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
                <button onClick={handleConfirmImport}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  Importar {reviewRows.length} transações
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {reviewRows.map((row, idx) => (
                <div key={row.tx.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${row.status === "pending" ? "bg-destructive/5" : "bg-secondary/30"}`}>
                  <span className="w-20 shrink-0 text-muted-foreground">{row.tx.date}</span>
                  <span className="min-w-0 flex-1 truncate" title={row.tx.description}>{row.tx.treatedName || row.tx.description}</span>
                  <span className={`w-24 shrink-0 text-right font-mono font-semibold ${row.tx.amount < 0 ? "text-destructive" : "text-primary"}`}>
                    {formatBRL(row.tx.amount)}
                  </span>
                  {/* Category selector */}
                  <div className="relative w-28 shrink-0">
                    <select
                      value={row.tx.category}
                      onChange={(e) => handleCategoryChange(idx, e.target.value as TransactionCategory)}
                      className={`w-full appearance-none rounded-md border px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary ${
                        row.status === "pending"
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
                  {/* Create rule button for pending */}
                  {row.status === "pending" ? (
                    <button onClick={() => openCreateRule(idx)} title="Criar regra"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                      <Sparkles className="h-3 w-3 text-primary/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
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
