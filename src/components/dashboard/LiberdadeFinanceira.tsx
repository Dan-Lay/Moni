import { TrendingUp, Target, Shield, Landmark, BarChart3, Bitcoin, Building2, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { CardSkeleton } from "./Skeletons";
import { formatBRLShort, INVESTMENT_SUBCATEGORY_ORDER, INVESTMENT_SUBCATEGORY_LABELS, InvestmentSubcategory } from "@/lib/types";

const SUBCAT_ICONS: Record<InvestmentSubcategory, React.ReactNode> = {
  emergencia: <PiggyBank className="h-3 w-3" />,
  renda_fixa: <Landmark className="h-3 w-3" />,
  previdencia: <Shield className="h-3 w-3" />,
  fiis: <Building2 className="h-3 w-3" />,
  acoes: <BarChart3 className="h-3 w-3" />,
  cripto: <Bitcoin className="h-3 w-3" />,
};

const SUBCAT_COLORS: Record<InvestmentSubcategory, string> = {
  emergencia: "hsl(var(--info))",
  renda_fixa: "hsl(var(--accent))",
  previdencia: "hsl(var(--primary))",
  fiis: "hsl(174, 62%, 55%)",
  acoes: "hsl(280, 55%, 60%)",
  cripto: "hsl(43, 90%, 52%)",
};

export const LiberdadeFinanceira = () => {
  const { data, finance, isLoading } = useFinance();
  if (isLoading) return <CardSkeleton hasBar />;

  const { aportePercentual } = data.config;

  // ── Revenue (denominator): all income excluding duplicates ──
  const validIncome = finance.monthTransactions
    .filter((t) => t.amount > 0 && t.reconciliationStatus !== "ja_conciliado")
    .reduce((a, t) => a + t.amount, 0);

  // Also add credit planned entries (not conciliado)
  const plannedIncome = (data.plannedEntries ?? [])
    .filter((e) => {
      if (e.conciliado) return false;
      if (e.amount <= 0) return false;
      const d = new Date(e.dueDate);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((a, e) => a + e.amount, 0);

  const totalRevenue = validIncome + plannedIncome;
  const meta = totalRevenue * (aportePercentual / 100);

  // ── Invested (numerator): real transactions ──
  const realInvestments = finance.monthTransactions
    .filter((t) => t.category === "investimentos" && t.amount < 0 && t.reconciliationStatus !== "ja_conciliado");
  const investidoReal = realInvestments.reduce((a, t) => a + Math.abs(t.amount), 0);

  // Planned investment entries (not conciliado, current month)
  const plannedInvestments = (data.plannedEntries ?? []).filter((e) => {
    if (e.conciliado) return false;
    if (e.category !== "investimentos") return false;
    const d = new Date(e.dueDate);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const investidoPlanned = plannedInvestments
    .filter((e) => e.amount < 0)
    .reduce((a, e) => a + Math.abs(e.amount), 0);

  const desapegoVendido = data.desapegoItems.filter((i) => i.sold).reduce((a, i) => a + i.value, 0);
  const totalAporte = investidoReal + investidoPlanned + desapegoVendido;
  const percent = meta > 0 ? (totalAporte / meta) * 100 : 0;
  const falta = meta - totalAporte;

  // ── Breakdown by subcategory ──
  const subcatTotals: Record<string, number> = {};
  for (const t of realInvestments) {
    const sub = t.subcategory || "sem_sub";
    subcatTotals[sub] = (subcatTotals[sub] || 0) + Math.abs(t.amount);
  }
  for (const e of plannedInvestments) {
    if (e.amount < 0) {
      const sub = e.subcategory || "sem_sub";
      subcatTotals[sub] = (subcatTotals[sub] || 0) + Math.abs(e.amount);
    }
  }

  const breakdown = INVESTMENT_SUBCATEGORY_ORDER
    .filter((key) => (subcatTotals[key] || 0) > 0)
    .map((key) => ({
      key,
      label: INVESTMENT_SUBCATEGORY_LABELS[key],
      amount: subcatTotals[key] || 0,
      icon: SUBCAT_ICONS[key],
      color: SUBCAT_COLORS[key],
    }));

  // Add "sem subcategoria" if exists
  if (subcatTotals["sem_sub"]) {
    breakdown.push({
      key: "sem_sub" as any,
      label: "Sem Subcategoria",
      amount: subcatTotals["sem_sub"],
      icon: <Target className="h-3 w-3" />,
      color: "hsl(var(--muted-foreground))",
    });
  }

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
      {breakdown.length > 0 && (
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
      )}
    </motion.div>
  );
};
