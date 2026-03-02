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
  emergencia: "hsl(220, 45%, 35%)",
  renda_fixa: "hsl(40, 40%, 55%)",
  previdencia: "hsl(220, 45%, 20%)",
  fiis: "hsl(160, 40%, 42%)",
  acoes: "hsl(220, 30%, 55%)",
  cripto: "hsl(40, 55%, 50%)",
};

export const LiberdadeFinanceira = () => {
  const { data, finance, isLoading } = useFinance();
  if (isLoading) return <CardSkeleton hasBar />;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ── Meta (denominador): soma orçada de investimentos do mês ──
  const plannedInvestments = (data.plannedEntries ?? []).filter((e) => {
    if (e.category !== "investimentos") return false;
    const d = new Date(e.dueDate);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const meta = plannedInvestments.reduce((a, e) => a + Math.abs(e.amount), 0);

  // Orçado por subcategoria
  const subcatOrcado: Record<string, number> = {};
  for (const e of plannedInvestments) {
    const sub = e.subcategory || "sem_sub";
    subcatOrcado[sub] = (subcatOrcado[sub] || 0) + Math.abs(e.amount);
  }

  // ── Realizado (numerador): transações REAIS de investimento, excluindo duplicados ──
  const realInvestments = finance.monthTransactions.filter(
    (t) => t.category === "investimentos" && t.reconciliationStatus !== "ja_conciliado"
  );
  const totalRealizado = realInvestments.reduce((a, t) => a + Math.abs(t.amount), 0);
  const percent = meta > 0 ? (totalRealizado / meta) * 100 : 0;
  const falta = meta - totalRealizado;

  // Realizado por subcategoria
  const subcatRealizado: Record<string, number> = {};
  for (const t of realInvestments) {
    const sub = t.subcategory || "sem_sub";
    subcatRealizado[sub] = (subcatRealizado[sub] || 0) + Math.abs(t.amount);
  }

  // ── Lista FIXA de subcategorias (sempre visível) ──
  const breakdown = INVESTMENT_SUBCATEGORY_ORDER.map((key) => ({
    key,
    label: INVESTMENT_SUBCATEGORY_LABELS[key],
    realizado: subcatRealizado[key] || 0,
    orcado: subcatOrcado[key] || 0,
    icon: SUBCAT_ICONS[key],
    color: SUBCAT_COLORS[key],
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-3xl p-6 relative overflow-visible">
      {/* Subtle champagne accent line */}
      <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, hsl(40 40% 75%), hsl(40 40% 85%), transparent)' }} />
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Liberdade Financeira</h3>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'hsl(40 40% 96%)' }}>
          <Target className="h-4 w-4" style={{ color: 'hsl(40 40% 55%)' }} />
        </div>
      </div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold text-foreground">{formatBRLShort(totalRealizado)}</span>
        <span className="text-sm text-muted-foreground">/ {formatBRLShort(meta)}</span>
      </div>
      <div className="mb-2 mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percent, 100)}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-primary" />
      </div>
      <div className="flex justify-between text-xs">
        <span className={percent >= 100 ? "text-primary font-semibold" : "text-muted-foreground"}>{percent.toFixed(0)}% da meta</span>
        {falta > 0 ? (
          <span className="font-mono" style={{ color: 'hsl(40 40% 50%)' }}>Faltam {formatBRLShort(falta)}</span>
        ) : (
          <span className="flex items-center gap-1 font-semibold" style={{ color: 'hsl(160 40% 42%)' }}><TrendingUp className="h-3 w-3" /> Meta atingida!</span>
        )}
      </div>

      {/* Investment breakdown */}
      <div className="mt-5 space-y-2">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Composicao</p>
        {breakdown.map((item) => {
          const barPct = item.orcado > 0 ? Math.min((item.realizado / item.orcado) * 100, 100) : (item.realizado > 0 ? 100 : 0);
          return (
            <div key={item.key} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 w-24 shrink-0">
                <span style={{ color: item.color }}>{item.icon}</span>
                <span className="text-[10px] text-muted-foreground truncate">{item.label}</span>
              </div>
              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ background: item.color }}
                />
              </div>
              <span className="text-[10px] font-mono font-semibold w-24 text-right">
                {formatBRLShort(item.realizado)}{item.orcado > 0 ? ` / ${formatBRLShort(item.orcado)}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
