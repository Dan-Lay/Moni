import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinance, useCategoryLabels } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { SPOUSE_LABELS, TransactionCategory, SpouseProfile, RECURRENCE_LABELS, ReconciliationStatus, RECONCILIATION_LABELS } from "@/lib/types";
import { getPriceAlerts } from "@/lib/storage";
import { upsertCategorizationRule } from "@/lib/rules-engine";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, PencilLine, Check, X, AlertTriangle, Globe, TrendingUp,
  CheckSquare, Square, Edit3, CalendarClock, CheckCircle2, Circle, GitMerge, FileUp, Copy,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AUTHOR_OPTIONS: { value: SpouseProfile | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "marido", label: "Marido" },
  { value: "esposa", label: "Esposa" },
  { value: "familia", label: "Família" },
];

type SourceFilter = "all" | "upload" | "lancamento";

// Unified row type
interface UnifiedRow {
  id: string;
  date: string;
  description: string;
  treatedName?: string;
  amount: number;
  category: TransactionCategory;
  spouseProfile: SpouseProfile;
  source: "upload" | "lancamento";
  conciliado?: boolean;
  recurrence?: string;
  isInternational?: boolean;
  isInefficient?: boolean;
  milesGenerated?: number;
  establishment?: string;
  isConfirmed?: boolean;
  reconciliationStatus?: ReconciliationStatus;
}

const Transactions = () => {
  const { data, updateTransaction, updatePlannedEntry, deleteTransaction, deleteTransactions } = useFinance();
  const { user } = useAuth();
  const categoryLabels = useCategoryLabels();
  const categoryOptions = useMemo(() => [
    { value: "all" as const, label: "Todas categorias" },
    ...Object.entries(categoryLabels).map(([v, l]) => ({ value: v as TransactionCategory, label: l })),
  ], [categoryLabels]);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<TransactionCategory | "all">("all");
  const [authorFilter, setAuthorFilter] = useState<SpouseProfile | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<TransactionCategory>("outros");
  const [editAmount, setEditAmount] = useState("");
  const [editAuthor, setEditAuthor] = useState<SpouseProfile>("marido");
  const [editDesc, setEditDesc] = useState("");
  const [editTreatedName, setEditTreatedName] = useState("");
  const [editSource, setEditSource] = useState<"upload" | "lancamento">("upload");

  // Bulk edit state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCat, setBulkCat] = useState<TransactionCategory | "">("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "single" | "bulk"; id?: string } | null>(null);

  const priceAlerts = useMemo(() => getPriceAlerts(data.transactions), [data.transactions]);

  // Build unified rows: transactions (from uploads) + planned entries (lançamentos)
  const unifiedRows = useMemo<UnifiedRow[]>(() => {
    const txRows: UnifiedRow[] = data.transactions
      .filter((t) => t.amount < 0) // only expenses
      .map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        treatedName: t.treatedName,
        amount: t.amount,
        category: t.category,
        spouseProfile: t.spouseProfile,
        source: "upload" as const,
        isInternational: t.isInternational,
        isInefficient: t.isInefficient,
        milesGenerated: t.milesGenerated,
        establishment: t.establishment,
        isConfirmed: t.isConfirmed,
        reconciliationStatus: t.reconciliationStatus,
      }));

    const peRows: UnifiedRow[] = (data.plannedEntries ?? []).map((e) => ({
      id: `pe_${e.id}`,
      date: e.dueDate,
      description: e.name,
      amount: e.amount,
      category: e.category,
      spouseProfile: e.spouseProfile,
      source: "lancamento" as const,
      conciliado: e.conciliado,
      recurrence: e.recurrence,
    }));

    return [...txRows, ...peRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.transactions, data.plannedEntries]);

  const filtered = useMemo(() => {
    return unifiedRows.filter((t) => {
      const searchLower = search.toLowerCase();
      const matchSearch = search === "" ||
        t.description.toLowerCase().includes(searchLower) ||
        (t.establishment || "").toLowerCase().includes(searchLower) ||
        (t.treatedName && t.treatedName.toLowerCase().includes(searchLower));
      const matchCat = catFilter === "all" || t.category === catFilter;
      const matchAuthor = authorFilter === "all" || t.spouseProfile === authorFilter;
      const matchSource = sourceFilter === "all" || t.source === sourceFilter;
      const matchConfirmed = !onlyConfirmed || !!t.isConfirmed;
      return matchSearch && matchCat && matchAuthor && matchSource && matchConfirmed;
    });
  }, [unifiedRows, search, catFilter, authorFilter, sourceFilter, onlyConfirmed]);

  const totalFiltered = filtered.reduce((a, t) => a + Math.abs(t.amount), 0);

  function startEdit(row: UnifiedRow) {
    setEditingId(row.id);
    setEditCat(row.category);
    setEditAmount(Math.abs(row.amount).toFixed(2));
    setEditAuthor(row.spouseProfile);
    setEditDesc(row.description);
    setEditTreatedName(row.treatedName || "");
    setEditSource(row.source);
  }

  async function confirmEdit() {
    if (!editingId) return;
    const parsed = parseFloat(editAmount.replace(",", "."));

    // Find original row to detect category change
    const originalRow = unifiedRows.find((r) => r.id === editingId);
    const categoryChanged = originalRow && originalRow.category !== editCat;

    if (editSource === "lancamento") {
      const realId = editingId.replace("pe_", "");
      await updatePlannedEntry(realId, {
        category: editCat,
        amount: isNaN(parsed) ? undefined : -Math.abs(parsed) as any,
        spouseProfile: editAuthor,
        name: editDesc || undefined,
      });
    } else {
      await updateTransaction(editingId, {
        category: editCat,
        amount: isNaN(parsed) ? undefined : -Math.abs(parsed) as any,
        spouseProfile: editAuthor,
        description: editDesc || undefined,
        treatedName: editTreatedName || undefined,
        isConfirmed: true,
      });
    }

    // Learning: upsert rule when category was changed
    if (categoryChanged && user?.id) {
      const keyword = originalRow.description || "";
      upsertCategorizationRule(keyword, editCat, editAuthor, user.id, user.familyId);
    }

    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((t) => t.id)));
  }

  async function applyBulkEdit() {
    if (!bulkCat || selectedIds.size === 0) return;
    const promises = Array.from(selectedIds).map((id) => {
      if (id.startsWith("pe_")) {
        return updatePlannedEntry(id.replace("pe_", ""), { category: bulkCat as TransactionCategory });
      }
      return updateTransaction(id, { category: bulkCat as TransactionCategory });
    });
    await Promise.all(promises);
    setSelectedIds(new Set());
    setBulkCat("");
    setBulkMode(false);
  }

  function cancelBulk() {
    setBulkMode(false);
    setSelectedIds(new Set());
    setBulkCat("");
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Extrato Unificado</h1>
          <p className="text-[11px] text-muted-foreground">Uploads + Lançamentos · visão reconciliada</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => bulkMode ? cancelBulk() : setBulkMode(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              bulkMode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <Edit3 className="h-3.5 w-3.5" />
            {bulkMode ? "Cancelar" : "Edição em Massa"}
          </button>
          <span className="text-xs text-muted-foreground">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-mono text-destructive">
              R$ {totalFiltered.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </span>
        </div>
      </div>

      {/* Bulk edit bar */}
      {bulkMode && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-primary/10 border border-primary/30 px-4 py-3">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            {selectedIds.size === filtered.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {selectedIds.size === filtered.length ? "Desmarcar todos" : "Selecionar todos"}
          </button>
          <span className="text-xs text-muted-foreground">{selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}</span>
          <div className="flex-1" />
          <Select value={bulkCat} onValueChange={(v) => setBulkCat(v as TransactionCategory)}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Nova categoria..." /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
            </SelectContent>
          </Select>
          <button onClick={applyBulkEdit} disabled={!bulkCat || selectedIds.size === 0}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 transition-all hover:bg-primary/90">
            Aplicar
          </button>
          <button onClick={() => setDeleteConfirm({ type: "bulk" })} disabled={selectedIds.size === 0}
            className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-50 transition-all hover:bg-destructive/90 flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Excluir Selecionados
          </button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v as TransactionCategory | "all")}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={authorFilter} onValueChange={(v) => setAuthorFilter(v as SpouseProfile | "all")}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {AUTHOR_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
          </SelectContent>
        </Select>
        {/* Source filter */}
        <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
          {([
            { value: "all", label: "Todos" },
            { value: "upload", label: "Uploads" },
            { value: "lancamento", label: "Lanç." },
          ] as { value: SourceFilter; label: string }[]).map((opt) => (
            <button key={opt.value} onClick={() => setSourceFilter(opt.value)}
              className={cn("rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
                sourceFilter === opt.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {opt.label}
            </button>
          ))}
        </div>
        {/* Confirmed filter toggle */}
        <button
          onClick={() => setOnlyConfirmed(!onlyConfirmed)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
            onlyConfirmed ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          Só confirmadas
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">
          Nenhum item encontrado. Ajuste os filtros ou importe extratos.
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
          <div className="space-y-1.5">
          <AnimatePresence>
            {filtered.map((t, i) => {
              const isEditing = editingId === t.id;
              const hasAlert = t.source === "upload" && priceAlerts.has(t.id);
              const isSelected = selectedIds.has(t.id);
              const isCredit = t.amount >= 0;
              const isPlanned = t.source === "lancamento";

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className={cn(
                    "glass-card rounded-xl px-4 py-3 transition-all",
                    isEditing && "ring-2 ring-primary/50",
                    isSelected && "ring-2 ring-primary/40 bg-primary/5",
                    hasAlert && !isEditing && !isSelected && "ring-1 ring-yellow-500/40"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-7 text-xs font-medium flex-1" placeholder="Descrição" />
                        <div className="flex gap-1 shrink-0">
                          <button onClick={confirmEdit} className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={cancelEdit} className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      {editSource === "upload" && (
                        <Input value={editTreatedName} onChange={(e) => setEditTreatedName(e.target.value)} className="h-7 text-xs flex-1" placeholder="Nome Tratado (apelido amigável)" />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Select value={editCat} onValueChange={(v) => setEditCat(v as TransactionCategory)}>
                          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(categoryLabels).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}</SelectContent>
                        </Select>
                        <Select value={editAuthor} onValueChange={(v) => setEditAuthor(v as SpouseProfile)}>
                          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="marido">Marido</SelectItem>
                            <SelectItem value="esposa">Esposa</SelectItem>
                            <SelectItem value="familia">Família</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                          <Input className="h-7 w-28 pl-7 text-xs font-mono" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {bulkMode && (
                        <button onClick={() => toggleSelect(t.id)} className="shrink-0 text-primary">
                          {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      )}

                      {/* Conciliation indicator for planned entries */}
                      {isPlanned && (
                        <div className="shrink-0">
                          {t.conciliado
                            ? <CheckCircle2 className="h-4 w-4 text-primary" />
                            : <Circle className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 w-full">
                          <p className={cn("text-sm font-medium whitespace-normal break-words min-w-[200px] flex-1", isPlanned && t.conciliado && "line-through text-muted-foreground")}>
                            {t.treatedName || t.establishment || t.description}
                          </p>
                          {hasAlert && (
                            <span className="flex items-center gap-0.5 text-[10px] text-yellow-500 font-semibold shrink-0">
                              <TrendingUp className="h-2.5 w-2.5" /> +20%
                            </span>
                          )}
                        </div>
                        {t.treatedName && (
                          <p className="text-[10px] text-muted-foreground whitespace-normal break-words">{t.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">{t.date}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {categoryLabels[t.category] ?? t.category}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4",
                            t.spouseProfile === "marido" && "border-blue-500/40 text-blue-400",
                            t.spouseProfile === "esposa" && "border-pink-500/40 text-pink-400",
                            t.spouseProfile === "familia" && "border-muted-foreground/40"
                          )}>
                            {SPOUSE_LABELS[t.spouseProfile]}
                          </Badge>
                          {/* Source badge */}
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4",
                            isPlanned ? "border-accent/40 text-accent" : "border-muted-foreground/30 text-muted-foreground"
                          )}>
                            {isPlanned ? "Lanç." : "Upload"}
                          </Badge>
                          {/* Reconciliation status badge */}
                          {t.reconciliationStatus && t.reconciliationStatus !== "pendente" && (
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4",
                              t.reconciliationStatus === "conciliado_auto" && "border-primary/40 text-primary",
                              t.reconciliationStatus === "ja_conciliado" && "border-muted-foreground/40 text-muted-foreground",
                              t.reconciliationStatus === "novo" && "border-blue-500/40 text-blue-400",
                            )}>
                              {t.reconciliationStatus === "conciliado_auto" && <GitMerge className="h-2.5 w-2.5 mr-0.5" />}
                              {t.reconciliationStatus === "ja_conciliado" && <Copy className="h-2.5 w-2.5 mr-0.5" />}
                              {t.reconciliationStatus === "novo" && <FileUp className="h-2.5 w-2.5 mr-0.5" />}
                              {RECONCILIATION_LABELS[t.reconciliationStatus]}
                            </Badge>
                          )}
                          {isPlanned && t.recurrence && t.recurrence !== "unico" && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <CalendarClock className="h-2.5 w-2.5" /> {RECURRENCE_LABELS[t.recurrence as keyof typeof RECURRENCE_LABELS]}
                            </span>
                          )}
                          {t.isInternational && (
                            <span className="flex items-center gap-0.5 text-[10px] text-sky-400"><Globe className="h-2.5 w-2.5" /> Intl</span>
                          )}
                          {t.isInefficient && (
                            <span className="flex items-center gap-0.5 text-[10px] text-yellow-500"><AlertTriangle className="h-2.5 w-2.5" /> Sem milhas</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className={cn("font-mono text-sm font-semibold", isCredit ? "text-primary" : "text-destructive")}>
                            {isCredit ? "+" : "-"}{Math.abs(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          {t.milesGenerated && t.milesGenerated > 0 && (
                            <p className="text-[10px] text-accent font-mono">+{t.milesGenerated} mi</p>
                          )}
                        </div>
                        {!bulkMode && (
                          <>
                            <button onClick={() => startEdit(t)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                              aria-label="Editar">
                              <PencilLine className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm({ type: "single", id: t.id })}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              aria-label="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "bulk"
                ? `Tem certeza que deseja excluir ${selectedIds.size} transação(ões)? Esta ação não pode ser desfeita.`
                : "Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteConfirm?.type === "single" && deleteConfirm.id) {
                  const id = deleteConfirm.id;
                  if (id.startsWith("pe_")) {
                    // It's a planned entry — delete from planned_entries table
                    const { deletePlannedEntry } = await import("@/contexts/DataContext").then(() => ({ deletePlannedEntry: data }));
                    // Use updatePlannedEntry context isn't ideal; for now skip pe_ deletes from transactions table
                    console.warn("[Moni] Cannot delete planned entries via transaction delete. Use Lançamentos page.");
                  } else {
                    await deleteTransaction(id);
                  }
                } else if (deleteConfirm?.type === "bulk") {
                  const allIds = Array.from(selectedIds);
                  // Separate transaction IDs from planned entry IDs
                  const txIds = allIds.filter(id => !id.startsWith("pe_"));
                  const peIds = allIds.filter(id => id.startsWith("pe_"));
                  if (txIds.length > 0) {
                    await deleteTransactions(txIds);
                  }
                  if (peIds.length > 0) {
                    console.warn(`[Moni] ${peIds.length} lançamento(s) ignorado(s) na exclusão em massa (use a página de Lançamentos).`);
                  }
                  setSelectedIds(new Set());
                  setBulkMode(false);
                }
                setDeleteConfirm(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Transactions;
