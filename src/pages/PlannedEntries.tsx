import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinance } from "@/contexts/DataContext";
import {
  CATEGORY_LABELS, RECURRENCE_LABELS, TransactionCategory, RecurrenceType, SpouseProfile, PlannedEntry, toISODate,
} from "@/lib/types";
import { addPlannedEntry, deletePlannedEntry, updatePlannedEntry } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, CheckCircle2, Circle, CalendarClock, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = Object.entries(RECURRENCE_LABELS).map(
  ([v, l]) => ({ value: v as RecurrenceType, label: l })
);

const emptyForm = {
  name: "",
  amount: "",
  category: "fixas" as TransactionCategory,
  dueDate: new Date().toISOString().split("T")[0],
  recurrence: "mensal" as RecurrenceType,
  spouseProfile: "familia" as SpouseProfile,
};

const PlannedEntriesPage = () => {
  const { data, reload } = useFinance();
  const entries = [...(data.plannedEntries ?? [])].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const pending = entries.filter((e) => !e.conciliado);
  const conciliated = entries.filter((e) => e.conciliado);

  const totalPending = pending
    .filter((e) => e.amount < 0)
    .reduce((a, e) => a + Math.abs(e.amount), 0);

  function handleAdd() {
    const amt = parseFloat(form.amount.replace(",", "."));
    if (!form.name || isNaN(amt)) return;
    const entry: PlannedEntry = {
      id: `pe_${Date.now()}`,
      name: form.name,
      amount: -Math.abs(amt),
      category: form.category,
      dueDate: toISODate(form.dueDate),
      recurrence: form.recurrence,
      spouseProfile: form.spouseProfile,
      conciliado: false,
      createdAt: toISODate(new Date().toISOString()),
    };
    addPlannedEntry(entry);
    setForm(emptyForm);
    setShowForm(false);
    reload();
  }

  function handleToggleConciliated(id: string, current: boolean) {
    updatePlannedEntry(id, { conciliado: !current });
    reload();
  }

  function handleDelete(id: string) {
    deletePlannedEntry(id);
    reload();
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Contas a Pagar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pending.length} pendente{pending.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-mono text-destructive">
              R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((p) => !p)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="glass-card rounded-2xl p-4 mb-4 overflow-hidden"
          >
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground">Novo Lançamento</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                placeholder="Nome (ex: Aluguel)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 text-sm"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="h-9 text-sm pl-8 font-mono"
                />
              </div>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="h-9 text-sm"
              />
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TransactionCategory })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v as RecurrenceType })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.spouseProfile} onValueChange={(v) => setForm({ ...form, spouseProfile: v as SpouseProfile })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="marido">Marido</SelectItem>
                  <SelectItem value="esposa">Esposa</SelectItem>
                  <SelectItem value="familia">Família</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAdd}>Salvar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending entries */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Pendentes
          </h2>
          <div className="space-y-2">
            <AnimatePresence>
              {pending.map((e) => (
                <EntryRow key={e.id} entry={e} onToggle={handleToggleConciliated} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Conciliated entries */}
      {conciliated.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Conciliados
          </h2>
          <div className="space-y-2 opacity-60">
            <AnimatePresence>
              {conciliated.map((e) => (
                <EntryRow key={e.id} entry={e} onToggle={handleToggleConciliated} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">
          Nenhum lançamento ainda. Clique em <strong>Novo</strong> para adicionar contas fixas ou variáveis.
        </div>
      )}
    </AppLayout>
  );
};

interface EntryRowProps {
  entry: PlannedEntry;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}

function EntryRow({ entry, onToggle, onDelete }: EntryRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-card flex items-center gap-3 rounded-xl px-4 py-3"
    >
      <button
        onClick={() => onToggle(entry.id, entry.conciliado)}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        aria-label="Conciliar"
      >
        {entry.conciliado
          ? <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
          : <Circle className="h-4.5 w-4.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn("text-sm font-medium", entry.conciliado && "line-through text-muted-foreground")}>
            {entry.name}
          </p>
          {entry.recurrence !== "unico" && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <RefreshCw className="h-2.5 w-2.5" /> {RECURRENCE_LABELS[entry.recurrence]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <CalendarClock className="h-2.5 w-2.5" /> {entry.dueDate}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {CATEGORY_LABELS[entry.category]}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4",
              entry.spouseProfile === "marido" && "border-blue-500/40 text-blue-400",
              entry.spouseProfile === "esposa" && "border-pink-500/40 text-pink-400",
            )}
          >
            {entry.spouseProfile === "marido" ? "Marido" : entry.spouseProfile === "esposa" ? "Esposa" : "Família"}
          </Badge>
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-destructive">
            -{Math.abs(entry.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          {entry.conciliado && entry.realAmount !== undefined && (
            <p className="text-[10px] text-muted-foreground font-mono line-through">
              Prev: {Math.abs(entry.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default PlannedEntriesPage;
