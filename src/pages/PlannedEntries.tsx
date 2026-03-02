import { useState, useMemo, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinance, useCategoryLabels } from "@/contexts/DataContext";
import {
  TransactionCategory, CATEGORY_LABELS,
  INVESTMENT_SUBCATEGORY_LABELS, INVESTMENT_SUBCATEGORY_ORDER, InvestmentSubcategory,
} from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, Check, X, PencilLine, Trash2,
  ShoppingCart, Heart, Stethoscope, Bus, Gamepad2, Home, TrendingUp, HelpCircle,
  Utensils, CreditCard, PiggyBank, Landmark, Shield, Building2, BarChart3, Bitcoin, GraduationCap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Category icons & colors ──
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  fixas: <Home className="h-4 w-4" />,
  saude: <Stethoscope className="h-4 w-4" />,
  alimentacao: <Utensils className="h-4 w-4" />,
  supermercado: <ShoppingCart className="h-4 w-4" />,
  lazer: <Gamepad2 className="h-4 w-4" />,
  transporte: <Bus className="h-4 w-4" />,
  investimentos: <TrendingUp className="h-4 w-4" />,
  compras: <CreditCard className="h-4 w-4" />,
  ajuda_mae: <Heart className="h-4 w-4" />,
  pagamento_fatura: <CreditCard className="h-4 w-4" />,
  outros: <HelpCircle className="h-4 w-4" />,
};

const CATEGORY_BG_COLORS: Record<string, string> = {
  fixas: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  saude: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
  alimentacao: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  supermercado: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400",
  lazer: "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400",
  transporte: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  investimentos: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  compras: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  ajuda_mae: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  pagamento_fatura: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400",
  outros: "bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400",
};

const SUBCAT_ICONS: Record<InvestmentSubcategory, React.ReactNode> = {
  emergencia: <PiggyBank className="h-3.5 w-3.5" />,
  renda_fixa: <Landmark className="h-3.5 w-3.5" />,
  previdencia: <Shield className="h-3.5 w-3.5" />,
  fiis: <Building2 className="h-3.5 w-3.5" />,
  acoes: <BarChart3 className="h-3.5 w-3.5" />,
  cripto: <Bitcoin className="h-3.5 w-3.5" />,
};

// ── Currency helpers ──
function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseCurrencyInput(masked: string): number {
  if (!masked) return 0;
  return parseFloat(masked.replace(/\./g, "").replace(",", ".")) || 0;
}
function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Status badge logic ──
function getStatusBadge(pct: number) {
  if (pct > 100) return { label: "Acima", className: "bg-destructive/15 text-destructive border-destructive/30" };
  if (pct >= 80) return { label: "Atenção", className: "bg-warning/15 text-warning border-warning/30" };
  return { label: "OK", className: "bg-primary/15 text-primary border-primary/30" };
}

const PlannedEntriesPage = () => {
  const { data, finance, upsertCategoryBudget, deleteCategoryBudget, loadBudgetsForMonth } = useFinance();
  const categoryLabels = useCategoryLabels();

  // Month selector
  const [monthOffset, setMonthOffset] = useState(0);
  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);
  const selectedMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = selectedDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // Load budgets when month changes
  useEffect(() => {
    loadBudgetsForMonth(selectedMonth);
  }, [selectedMonth, loadBudgetsForMonth]);

  // Compute "Realizado" per category from transactions
  const realizado = useMemo(() => {
    const result: Record<string, number> = {};
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    for (const t of data.transactions) {
      const d = new Date(t.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      if (t.amount >= 0) continue; // only expenses
      if (t.isIgnored) continue;
      // For investments with subcategory, track both parent and sub
      if (t.category === "investimentos" && t.subcategory) {
        const subKey = `investimentos:${t.subcategory}`;
        result[subKey] = (result[subKey] || 0) + Math.abs(t.amount);
      }
      result[t.category] = (result[t.category] || 0) + Math.abs(t.amount);
    }
    return result;
  }, [data.transactions, selectedDate]);

  // Build budget map from categoryBudgets
  const budgetMap = useMemo(() => {
    const map: Record<string, { id: string; amount: number }> = {};
    for (const b of data.categoryBudgets) {
      if (b.month === selectedMonth) {
        map[b.category] = { id: b.id, amount: b.amount };
      }
    }
    return map;
  }, [data.categoryBudgets, selectedMonth]);

  // All categories that have a budget or expenses
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    // Add all built-in categories from labels
    for (const key of Object.keys(categoryLabels)) {
      if (key === "pagamento_fatura") continue; // skip non-budget category
      cats.add(key);
    }
    // Add any that have expenses
    for (const key of Object.keys(realizado)) {
      if (!key.includes(":")) cats.add(key);
    }
    return Array.from(cats);
  }, [categoryLabels, realizado]);

  // For investimentos: sum subcategory budgets as parent budget
  const investimentosOrcado = useMemo(() => {
    return INVESTMENT_SUBCATEGORY_ORDER.reduce((sum, sub) => {
      const key = `investimentos:${sub}`;
      return sum + (budgetMap[key]?.amount || 0);
    }, 0);
  }, [budgetMap]);

  // Totals
  const totalOrcado = useMemo(() => {
    return allCategories.reduce((sum, cat) => {
      if (cat === "investimentos") return sum + investimentosOrcado;
      return sum + (budgetMap[cat]?.amount || 0);
    }, 0);
  }, [allCategories, budgetMap, investimentosOrcado]);

  const totalRealizado = useMemo(() => {
    return allCategories.reduce((sum, cat) => sum + (realizado[cat] || 0), 0);
  }, [allCategories, realizado]);

  const economia = totalOrcado - totalRealizado;
  const totalPct = totalOrcado > 0 ? (totalRealizado / totalOrcado) * 100 : 0;

  // Editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Accordion for investimentos
  const [investOpen, setInvestOpen] = useState(false);

  // Add category dropdown
  const [showAddCat, setShowAddCat] = useState(false);

  const startEdit = useCallback((key: string, currentAmount: number) => {
    setEditingKey(key);
    setEditValue(currentAmount > 0
      ? currentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "");
  }, []);

  const confirmEdit = useCallback(async (key: string) => {
    const amount = parseCurrencyInput(editValue);
    setSavingKey(key);
    try {
      await upsertCategoryBudget(key, selectedMonth, amount);
      setEditingKey(null);
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
    } finally {
      setSavingKey(null);
    }
  }, [editValue, selectedMonth, upsertCategoryBudget]);

  const cancelEdit = useCallback(() => {
    setEditingKey(null);
  }, []);

  // Render a single category row
  const renderCategoryRow = (cat: string, label: string, orcado: number, real: number, isSubcategory = false) => {
    const pct = orcado > 0 ? (real / orcado) * 100 : (real > 0 ? 100 : 0);
    const status = getStatusBadge(pct);
    const isEditing = editingKey === cat;
    const isSaving = savingKey === cat;
    const justSaved = savedKey === cat;

    return (
      <motion.div
        key={cat}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "glass-card rounded-2xl px-4 py-3 transition-all",
          isSubcategory && "ml-6 rounded-xl",
        )}
      >
        <div className="flex items-center gap-3">
          {/* Icon circle */}
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            isSubcategory ? "h-7 w-7" : "",
            CATEGORY_BG_COLORS[isSubcategory ? "investimentos" : cat] || CATEGORY_BG_COLORS.outros,
          )}>
            {isSubcategory
              ? SUBCAT_ICONS[cat.split(":")[1] as InvestmentSubcategory] || <HelpCircle className="h-3.5 w-3.5" />
              : CATEGORY_ICONS[cat] || <HelpCircle className="h-4 w-4" />}
          </div>

          {/* Center content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-medium", isSubcategory && "text-xs")}>{label}</span>
                {cat === "investimentos" && !isSubcategory && (
                  <button
                    onClick={() => setInvestOpen((p) => !p)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", investOpen && "rotate-180")} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Status badge */}
                {orcado > 0 && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", status.className)}>
                    {status.label}
                  </Badge>
                )}
                {/* Values */}
                <span className={cn("font-mono text-xs", isSubcategory && "text-[11px]")}>
                  <span className="text-foreground font-semibold">R$ {fmtBRL(real)}</span>
                  <span className="text-muted-foreground"> / R$ {fmtBRL(orcado)}</span>
                  {orcado > 0 && (
                    <span className={cn("ml-1", pct > 100 ? "text-destructive" : "text-muted-foreground")}>
                      ({Math.round(pct)}%)
                    </span>
                  )}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.6 }}
                className={cn(
                  "h-full rounded-full",
                  pct > 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary"
                )}
              />
            </div>
          </div>

          {/* Edit actions — only for non-parent investimentos */}
          {!(cat === "investimentos" && !isSubcategory) && (
            <div className="shrink-0 flex items-center gap-1">
              {isEditing ? (
                <>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                    <Input
                      className="h-7 w-24 pl-7 text-xs font-mono"
                      value={editValue}
                      inputMode="numeric"
                      autoFocus
                      onChange={(e) => setEditValue(formatCurrencyInput(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmEdit(cat);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                  </div>
                  <button
                    onClick={() => confirmEdit(cat)}
                    disabled={isSaving}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                      isSaving ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary/20 text-primary hover:bg-primary/30"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={cancelEdit} className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  {justSaved ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-7 w-7 items-center justify-center text-primary">
                      <Check className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => startEdit(cat, orcado)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Editar meta"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      {/* Month selector */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setMonthOffset((p) => p - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold capitalize">{monthLabel}</h1>
        <button onClick={() => setMonthOffset((p) => p + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Planejado</p>
          <p className="font-mono text-lg font-bold">R$ {fmtBRL(totalOrcado)}</p>
          <p className="text-[10px] text-muted-foreground">{allCategories.filter(c => (budgetMap[c]?.amount || 0) > 0 || (c === "investimentos" && investimentosOrcado > 0)).length} categorias</p>
        </div>
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Realizado</p>
          <p className="font-mono text-lg font-bold">R$ {fmtBRL(totalRealizado)}</p>
          <p className="text-[10px] text-muted-foreground">{totalOrcado > 0 ? `${Math.round(totalPct)}% do planejado` : "—"}</p>
        </div>
        <div className="glass-card rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Economia</p>
          <p className={cn("font-mono text-lg font-bold", economia >= 0 ? "text-primary" : "text-destructive")}>
            R$ {fmtBRL(Math.abs(economia))}
          </p>
          <p className="text-[10px] text-muted-foreground">{economia >= 0 ? "abaixo" : "acima"}</p>
        </div>
      </div>

      {/* Master progress bar */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Consumo do Orçamento</span>
          <span className="font-mono font-semibold">{totalOrcado > 0 ? `${Math.round(totalPct)}%` : "0%"}</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(totalPct, 100)}%` }}
            transition={{ duration: 0.8 }}
            className={cn(
              "h-full rounded-full",
              totalPct > 100 ? "bg-destructive" : totalPct >= 80 ? "bg-warning" : "bg-primary"
            )}
          />
        </div>
      </div>

      {/* Category list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Orçamento por Categoria</h2>
      </div>

      <div className="space-y-3">
        {allCategories
          .sort((a, b) => {
            const aVal = a === "investimentos" ? investimentosOrcado : (budgetMap[a]?.amount || 0);
            const bVal = b === "investimentos" ? investimentosOrcado : (budgetMap[b]?.amount || 0);
            return bVal - aVal;
          })
          .map((cat) => {
            const label = categoryLabels[cat] || CATEGORY_LABELS[cat as TransactionCategory] || cat;
            const isInvest = cat === "investimentos";
            const orcado = isInvest ? investimentosOrcado : (budgetMap[cat]?.amount || 0);
            const real = realizado[cat] || 0;

            return (
              <div key={cat}>
                {renderCategoryRow(cat, label, orcado, real)}
                {/* Investimentos accordion */}
                {isInvest && (
                  <AnimatePresence>
                    {investOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 mt-2 overflow-hidden"
                      >
                        {INVESTMENT_SUBCATEGORY_ORDER.map((sub) => {
                          const subKey = `investimentos:${sub}`;
                          const subLabel = INVESTMENT_SUBCATEGORY_LABELS[sub];
                          const subOrcado = budgetMap[subKey]?.amount || 0;
                          const subReal = realizado[subKey] || 0;
                          return renderCategoryRow(subKey, subLabel, subOrcado, subReal, true);
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          })}
      </div>

      {/* Empty state */}
      {allCategories.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm mt-4">
          Nenhuma categoria configurada. Adicione metas para começar.
        </div>
      )}
    </AppLayout>
  );
};

export default PlannedEntriesPage;
