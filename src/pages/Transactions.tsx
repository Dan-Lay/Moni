import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinance } from "@/contexts/DataContext";
import { CATEGORY_LABELS, SPOUSE_LABELS, TransactionCategory, SpouseProfile } from "@/lib/types";
import { getPriceAlerts } from "@/lib/storage";
import { updateTransaction } from "@/lib/pocketbase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, PencilLine, Check, X, AlertTriangle, Globe, TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: { value: TransactionCategory | "all"; label: string }[] = [
  { value: "all", label: "Todas categorias" },
  ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v as TransactionCategory, label: l })),
];

const AUTHOR_OPTIONS: { value: SpouseProfile | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "marido", label: "Marido" },
  { value: "esposa", label: "Esposa" },
  { value: "familia", label: "Família" },
];

const Transactions = () => {
  const { data, reload } = useFinance();
  const allTxs = [...data.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<TransactionCategory | "all">("all");
  const [authorFilter, setAuthorFilter] = useState<SpouseProfile | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<TransactionCategory>("outros");
  const [editAmount, setEditAmount] = useState("");
  const [editAuthor, setEditAuthor] = useState<SpouseProfile>("marido");
  const [editDesc, setEditDesc] = useState("");

  const priceAlerts = useMemo(() => getPriceAlerts(data.transactions), [data.transactions]);

  const filtered = useMemo(() => {
    return allTxs.filter((t) => {
      if (t.amount > 0) return false;
      const matchSearch = search === "" ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.establishment.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || t.category === catFilter;
      const matchAuthor = authorFilter === "all" || t.spouseProfile === authorFilter;
      return matchSearch && matchCat && matchAuthor;
    });
  }, [allTxs, search, catFilter, authorFilter]);

  const totalFiltered = filtered.reduce((a, t) => a + Math.abs(t.amount), 0);

  function startEdit(id: string) {
    const tx = allTxs.find((t) => t.id === id);
    if (!tx) return;
    setEditingId(id);
    setEditCat(tx.category);
    setEditAmount(Math.abs(tx.amount).toFixed(2));
    setEditAuthor(tx.spouseProfile);
    setEditDesc(tx.description);
  }

  async function confirmEdit() {
    if (!editingId) return;
    const parsed = parseFloat(editAmount.replace(",", "."));
    await updateTransaction(editingId, {
      category: editCat,
      amount: isNaN(parsed) ? undefined : -Math.abs(parsed) as any,
      spouseProfile: editAuthor,
      description: editDesc || undefined,
    });
    setEditingId(null);
    reload();
  }

  function cancelEdit() {
    setEditingId(null);
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Extrato</h1>
          <p className="text-[11px] text-muted-foreground">Dados reais por trás dos gráficos</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} lançamento{filtered.length !== 1 ? "s" : ""} ·{" "}
          <span className="font-mono text-destructive">
            R$ {totalFiltered.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar estabelecimento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v as TransactionCategory | "all")}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={authorFilter} onValueChange={(v) => setAuthorFilter(v as SpouseProfile | "all")}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTHOR_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">
          Nenhuma transação encontrada. Ajuste os filtros ou importe extratos.
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {filtered.map((t, i) => {
              const isEditing = editingId === t.id;
              const hasAlert = priceAlerts.has(t.id);

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
                    hasAlert && !isEditing && "ring-1 ring-yellow-500/40"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="h-7 text-xs font-medium flex-1"
                          placeholder="Nome / Descrição"
                        />
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={confirmEdit}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Select value={editCat} onValueChange={(v) => setEditCat(v as TransactionCategory)}>
                          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
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
                          <Input
                            className="h-7 w-28 pl-7 text-xs font-mono"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{t.establishment || t.description}</p>
                          {hasAlert && (
                            <span className="flex items-center gap-0.5 text-[10px] text-yellow-500 font-semibold">
                              <TrendingUp className="h-2.5 w-2.5" /> +20% histórico
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">{t.date}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {CATEGORY_LABELS[t.category]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4",
                              t.spouseProfile === "marido" && "border-blue-500/40 text-blue-400",
                              t.spouseProfile === "esposa" && "border-pink-500/40 text-pink-400",
                              t.spouseProfile === "familia" && "border-muted-foreground/40"
                            )}
                          >
                            {SPOUSE_LABELS[t.spouseProfile]}
                          </Badge>
                          {t.isInternational && (
                            <span className="flex items-center gap-0.5 text-[10px] text-sky-400">
                              <Globe className="h-2.5 w-2.5" /> Intl
                            </span>
                          )}
                          {t.isInefficient && (
                            <span className="flex items-center gap-0.5 text-[10px] text-yellow-500">
                              <AlertTriangle className="h-2.5 w-2.5" /> Sem milhas
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className="font-mono text-sm font-semibold text-destructive">
                            -{Math.abs(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          {t.milesGenerated > 0 && (
                            <p className="text-[10px] text-accent font-mono">+{t.milesGenerated} mi</p>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(t.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                          aria-label="Editar"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </AppLayout>
  );
};

export default Transactions;
