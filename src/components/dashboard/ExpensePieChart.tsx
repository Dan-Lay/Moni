import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useFinance } from "@/contexts/DataContext";
import { CATEGORY_LABELS, TransactionCategory } from "@/lib/types";
import { ChartSkeleton } from "./Skeletons";
import { TransactionDetailPanel } from "./TransactionDetailPanel";
import { useState } from "react";

// Fixed color map: categories with strong semantic meaning get pinned colors
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

// Reverse lookup: label → category key
const LABEL_TO_KEY: Record<string, TransactionCategory> = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([k, v]) => [v, k as TransactionCategory])
);

export const ExpensePieChart = () => {
  const { finance, isLoading } = useFinance();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  if (isLoading) return <ChartSkeleton />;

  const byCategory = finance.categoryBreakdown;
  const hasData = Object.keys(byCategory).length > 0;
  const chartData = hasData
    ? Object.entries(byCategory).map(([cat, val]) => ({
        name: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat,
        value: Math.round(val),
      }))
    : DEMO_DATA;

  // Get transactions for a category label
  const getCategoryTxs = (label: string) => {
    const catKey = LABEL_TO_KEY[label];
    if (!catKey) return [];
    return finance.monthTransactions.filter((t) => t.amount < 0 && t.category === catKey);
  };

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
      <div className="flex items-center gap-4">
        <div className="h-44 w-44 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                onClick={(_, idx) => {
                  if (!hasData) return;
                  const name = chartData[idx]?.name;
                  setSelectedCategory(selectedCategory === name ? null : name);
                }}
                className="cursor-pointer"
              >
                {chartData.map((item, i) => (
                  <Cell
                    key={i}
                    fill={getColor(item.name, i)}
                    stroke={item.name === "Ajuda Mãe" ? "hsl(270, 70%, 72%)" : "none"}
                    strokeWidth={item.name === "Ajuda Mãe" ? 2 : 0}
                    opacity={selectedCategory && selectedCategory !== item.name ? 0.4 : 1}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {chartData.map((item, i) => {
            const txs = hasData ? getCategoryTxs(item.name) : [];
            return (
              <div key={item.name}>
                <button
                  onClick={() => {
                    if (!hasData) return;
                    setSelectedCategory(selectedCategory === item.name ? null : item.name);
                  }}
                  className="flex w-full items-center justify-between text-xs hover:bg-secondary/30 rounded px-1 py-0.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{
                        background: getColor(item.name, i),
                        boxShadow: item.name === "Ajuda Mãe" ? `0 0 6px hsl(270, 70%, 58%)` : "none",
                      }}
                    />
                    <span className={`text-muted-foreground ${item.name === "Ajuda Mãe" ? "font-semibold" : ""}`}>
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono font-medium">R$ {item.value.toLocaleString("pt-BR")}</span>
                </button>
                {hasData && selectedCategory === item.name && txs.length > 0 && (
                  <TransactionDetailPanel transactions={txs} label={item.name} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
