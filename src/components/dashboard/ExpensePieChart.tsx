import { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useFinance } from "@/contexts/DataContext";
import { CATEGORY_LABELS } from "@/lib/types";
import { ChartSkeleton } from "./Skeletons";

const CATEGORY_FIXED_COLORS: Record<string, string> = {
  "Ajuda Mãe": "hsl(270, 70%, 58%)",
  "Investimentos": "hsl(160, 84%, 39%)",
  "Fixas": "hsl(200, 80%, 50%)",
  "Supermercado": "hsl(43, 96%, 56%)",
  "Alimentação": "hsl(20, 80%, 55%)",
  "Lazer": "hsl(340, 75%, 55%)",
  "Transporte": "hsl(100, 60%, 45%)",
  "Saúde": "hsl(190, 70%, 50%)",
  "Compras": "hsl(240, 50%, 55%)",
  "Outros": "hsl(0, 0%, 55%)",
};

const FALLBACK_COLORS = [
  "hsl(160, 84%, 39%)", "hsl(200, 80%, 50%)", "hsl(43, 96%, 56%)",
  "hsl(340, 75%, 55%)", "hsl(20, 80%, 55%)", "hsl(100, 60%, 45%)",
  "hsl(240, 50%, 55%)", "hsl(0, 60%, 50%)",
];

const DEMO_DATA = [
  { name: "Supermercado", value: 2200 },
  { name: "Fixas", value: 3500 },
  { name: "Ajuda Mãe", value: 800 },
  { name: "Lazer", value: 600 },
  { name: "Investimentos", value: 1450 },
  { name: "Outros", value: 950 },
];

const getColor = (name: string, index: number): string =>
  CATEGORY_FIXED_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

export const ExpensePieChart = () => {
  const { finance, data, isLoading } = useFinance();

  // Merge realizado (transactions) + orçado pendente (planned entries)
  const chartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // 1. Realizado: from categoryBreakdown (already filtered: amount < 0, !isIgnored, != ja_conciliado)
    const realizado: Record<string, number> = {};
    for (const [cat, val] of Object.entries(finance.categoryBreakdown)) {
      const label = CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat;
      realizado[label] = (realizado[label] || 0) + val;
    }

    // 2. Orçado pendente: categoryBudgets do mês atual — o que ainda falta sair
    const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const orcadoPendente: Record<string, number> = {};
    for (const budget of (data.categoryBudgets ?? [])) {
      if (budget.month !== currentMonthKey) continue;
      if (budget.category.includes(":")) continue; // skip subcategories
      const label = CATEGORY_LABELS[budget.category as keyof typeof CATEGORY_LABELS] || budget.category;
      const budgetAmt = budget.amount;
      const realizadoAmt = realizado[label] || 0;
      const pendente = Math.max(0, budgetAmt - realizadoAmt);
      if (pendente > 0) orcadoPendente[label] = (orcadoPendente[label] || 0) + pendente;
    }

    // 3. Merge: valor_final = realizado + orcado_pendente
    const allCategories = new Set([...Object.keys(realizado), ...Object.keys(orcadoPendente)]);
    const merged = Array.from(allCategories)
      .map((name) => ({
        name,
        value: Math.round((realizado[name] || 0) + (orcadoPendente[name] || 0)),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    return merged.length > 0 ? merged : null;
  }, [finance.categoryBreakdown, data.categoryBudgets]);

  if (isLoading) return <ChartSkeleton />;

  const displayData = chartData ?? DEMO_DATA;
  const hasData = chartData !== null;
  const total = displayData.reduce((a, d) => a + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-5"
    >
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
        Gastos por Categoria
        {!hasData && <span className="ml-2 text-[10px] text-accent">(exemplo)</span>}
      </h3>
      <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
        <div className="h-44 w-44 flex-shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
              >
                {displayData.map((item, i) => (
                  <Cell key={i} fill={getColor(item.name, i)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => {
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                  return [`R$ ${value.toLocaleString("pt-BR")} (${pct}%)`, ""];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:flex-1 space-y-2 mt-2 md:mt-0">
          {displayData.map((item, i) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
            return (
              <div
                key={item.name}
                className="flex w-full items-center justify-between text-xs px-1 py-0.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: getColor(item.name, i) }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-mono font-medium text-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
