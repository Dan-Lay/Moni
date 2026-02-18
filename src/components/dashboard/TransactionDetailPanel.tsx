import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Pencil, Check, X } from "lucide-react";
import { Transaction, CATEGORY_LABELS, TransactionCategory } from "@/lib/types";
import { editTransaction } from "@/lib/storage";
import { useFinance } from "@/contexts/DataContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  /** Transactions to display in the detail panel */
  transactions: Transaction[];
  /** Label for the panel header */
  label: string;
}

export const TransactionDetailPanel = ({ transactions, label }: Props) => {
  const { reload } = useFinance();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<TransactionCategory>("outros");

  if (transactions.length === 0) return null;

  function startEdit(tx: Transaction) {
    setEditingId(tx.id);
    setEditCategory(tx.category);
  }

  function saveEdit(id: string) {
    editTransaction(id, { category: editCategory });
    setEditingId(null);
    reload();
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Ver Detalhes
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-border bg-card/50 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">Descrição</th>
                    <th className="px-3 py-2 text-left font-medium">Categoria</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {tx.date.substring(5)}
                      </td>
                      <td className="px-3 py-2 max-w-[180px] truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === tx.id ? (
                          <Select value={editCategory} onValueChange={(v) => setEditCategory(v as TransactionCategory)}>
                            <SelectTrigger className="h-6 text-[11px] w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                                <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                            {CATEGORY_LABELS[tx.category]}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-destructive whitespace-nowrap">
                        -{Math.abs(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-1.5">
                        {editingId === tx.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(tx.id)}
                              className="rounded p-1 text-primary hover:bg-primary/10 transition-colors"
                              aria-label="Salvar"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded p-1 text-muted-foreground hover:bg-secondary transition-colors"
                              aria-label="Cancelar"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(tx)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Editar categoria"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
