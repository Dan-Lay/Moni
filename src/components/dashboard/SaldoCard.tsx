import { CreditCard, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { CardSkeleton } from "./Skeletons";
import { formatBRLShort } from "@/lib/types";

export const SaldoCard = () => {
  const { finance, isLoading } = useFinance();
  if (isLoading) return <CardSkeleton hasBar />;

  const { salarioLiquido, monthTransactions } = finance;
  const faturaSantander = monthTransactions
    .filter((t) => t.source === "santander" && t.amount < 0)
    .reduce((a, t) => a + Math.abs(t.amount), 0);
  const totalDebits = monthTransactions
    .filter((t) => t.amount < 0)
    .reduce((a, t) => a + Math.abs(t.amount), 0);
  const fatura = faturaSantander || totalDebits * 0.5;
  const disponivel = salarioLiquido - fatura;
  const percentPreso = (fatura / salarioLiquido) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Saldo vs Fatura Santander</h3>
        <CreditCard className="h-4 w-4 text-destructive" />
      </div>
      <div className="mb-1 font-mono text-3xl font-bold tracking-tight">{formatBRLShort(disponivel)}</div>
      <p className="mb-4 text-xs text-muted-foreground">disponível após fatura</p>
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-muted-foreground">Fatura Santander</span>
        <span className="font-mono font-semibold text-destructive">{formatBRLShort(fatura)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percentPreso, 100)}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-destructive" />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{percentPreso.toFixed(0)}% do salário comprometido</p>
      {percentPreso > 40 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs text-destructive">Fatura acima de 40% do salário</span>
        </div>
      )}
    </motion.div>
  );
};
