import { CreditCard, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { CardSkeleton } from "./Skeletons";
import { formatBRLShort } from "@/lib/types";

const CARD_COLORS: Record<string, string> = {
  santander: "hsl(0, 72%, 51%)",
  nubank: "hsl(270, 60%, 55%)",
  bradesco: "hsl(0, 80%, 42%)",
};

const CARD_LABELS: Record<string, string> = {
  santander: "Santander",
  nubank: "Nubank",
  bradesco: "Bradesco",
};

export const SaldoCard = () => {
  const { finance, isLoading } = useFinance();
  if (isLoading) return <CardSkeleton hasBar />;

  const { salarioLiquido, monthTransactions } = finance;

  const cardTotals = ["santander", "nubank", "bradesco"].map((source) => {
    const total = monthTransactions
      .filter((t) => t.source === source && t.amount < 0)
      .reduce((a, t) => a + Math.abs(t.amount), 0);
    return { source, total };
  }).filter((c) => c.total > 0);

  const totalFatura = cardTotals.reduce((a, c) => a + c.total, 0) || 
    monthTransactions.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0) * 0.5;

  const disponivel = salarioLiquido - totalFatura;
  const percentPreso = (totalFatura / salarioLiquido) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Saldo vs Cartões de Crédito</h3>
        <CreditCard className="h-4 w-4 text-destructive" />
      </div>
      <div className="mb-1 font-mono text-3xl font-bold tracking-tight">{formatBRLShort(disponivel)}</div>
      <p className="mb-4 text-xs text-muted-foreground">disponível após faturas</p>

      {/* Individual card bars */}
      <div className="space-y-2 mb-3">
        {cardTotals.map((card) => {
          const pct = (card.total / salarioLiquido) * 100;
          return (
            <div key={card.source}>
              <div className="flex justify-between text-xs mb-0.5 min-w-0">
                <span className="text-muted-foreground truncate">{CARD_LABELS[card.source]}</span>
                <span className="font-mono font-semibold text-destructive flex-shrink-0">{formatBRLShort(card.total)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full"
                  style={{ background: CARD_COLORS[card.source] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total bar */}
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground font-semibold">Total Faturas</span>
        <span className="font-mono font-semibold text-destructive">{formatBRLShort(totalFatura)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percentPreso, 100)}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-destructive" />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{percentPreso.toFixed(0)}% do salário comprometido</p>
      {percentPreso > 40 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs text-destructive">Faturas acima de 40% do salário</span>
        </div>
      )}
    </motion.div>
  );
};
