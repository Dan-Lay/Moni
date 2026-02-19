import { TrendingUp, Target, Shield, Landmark, BarChart3, Bitcoin, Building2, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { CardSkeleton } from "./Skeletons";
import { formatBRLShort } from "@/lib/types";

interface InvestmentBreakdown {
  label: string;
  key: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
}

export const LiberdadeFinanceira = () => {
  const { data, finance, isLoading } = useFinance();
  if (isLoading) return <CardSkeleton hasBar />;

  const { salarioLiquido, aportePercentual } = data.config;
  const meta = salarioLiquido * (aportePercentual / 100);
  const investido = finance.monthTransactions
    .filter((t) => t.category === "investimentos" && t.amount < 0)
    .reduce((a, t) => a + Math.abs(t.amount), 0);
  const desapegoVendido = data.desapegoItems.filter((i) => i.sold).reduce((a, i) => a + i.value, 0);
  const totalAporte = investido + desapegoVendido;
  const percent = meta > 0 ? (totalAporte / meta) * 100 : 0;
  const falta = meta - totalAporte;

  // Investment breakdown from config (mock provides these)
  const cfg = data.config as any;
  const breakdown: InvestmentBreakdown[] = [
    { label: "Previdência", key: "previdencia", amount: cfg.investPrevidencia ?? 300, icon: <Shield className="h-3 w-3" />, color: "hsl(var(--primary))" },
    { label: "Emergência", key: "emergencia", amount: cfg.investEmergencia ?? 400, icon: <PiggyBank className="h-3 w-3" />, color: "hsl(var(--info))" },
    { label: "Renda Fixa", key: "rendaFixa", amount: cfg.investRendaFixa ?? 350, icon: <Landmark className="h-3 w-3" />, color: "hsl(var(--accent))" },
    { label: "FIIs", key: "fiis", amount: cfg.investFIIs ?? 300, icon: <Building2 className="h-3 w-3" />, color: "hsl(174, 62%, 55%)" },
    { label: "Ações", key: "acoes", amount: cfg.investAcoes ?? 250, icon: <BarChart3 className="h-3 w-3" />, color: "hsl(280, 55%, 60%)" },
    { label: "Bitcoin", key: "bitcoin", amount: cfg.investBitcoin ?? 200, icon: <Bitcoin className="h-3 w-3" />, color: "hsl(43, 90%, 52%)" },
  ];

  const totalBreakdown = breakdown.reduce((a, b) => a + b.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Liberdade Financeira ({aportePercentual}%)</h3>
        <Target className="h-4 w-4 text-primary" />
      </div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold">{formatBRLShort(totalAporte)}</span>
        <span className="text-sm text-muted-foreground">/ {formatBRLShort(meta)}</span>
      </div>
      <div className="mb-2 mt-4 h-3 overflow-hidden rounded-full bg-secondary">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percent, 100)}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-primary" />
      </div>
      <div className="flex justify-between text-xs">
        <span className={percent >= 100 ? "text-primary font-semibold" : "text-muted-foreground"}>{percent.toFixed(0)}% da meta</span>
        {falta > 0 ? (
          <span className="text-warning font-mono">Faltam {formatBRLShort(falta)}</span>
        ) : (
          <span className="flex items-center gap-1 text-primary"><TrendingUp className="h-3 w-3" /> Meta atingida!</span>
        )}
      </div>

      {/* Investment breakdown */}
      <div className="mt-4 space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Composição</p>
        {breakdown.map((item) => {
          const pct = totalBreakdown > 0 ? (item.amount / totalBreakdown) * 100 : 0;
          return (
            <div key={item.key} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 w-24 shrink-0">
                <span style={{ color: item.color }}>{item.icon}</span>
                <span className="text-[10px] text-muted-foreground truncate">{item.label}</span>
              </div>
              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ background: item.color }}
                />
              </div>
              <span className="text-[10px] font-mono font-semibold w-16 text-right">{formatBRLShort(item.amount)}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
