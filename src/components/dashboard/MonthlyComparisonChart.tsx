import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/DataContext";
import { ChartSkeleton } from "./Skeletons";
import { formatBRL } from "@/lib/types";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const DEMO_DATA = [
  { month: "Dez", creditos: 12000, debitos: 8500 },
  { month: "Jan", creditos: 12000, debitos: 9200 },
  { month: "Fev", creditos: 12000, debitos: 7800 },
];

export const MonthlyComparisonChart = () => {
  const { data, isLoading } = useFinance();

  const chartData = useMemo(() => {
    const txs = data.transactions;
    if (txs.length === 0) return DEMO_DATA;

    const now = new Date();
    const months: { month: string; creditos: number; debitos: number }[] = [];

    for (let offset = -2; offset <= 0; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${MONTH_NAMES[month]}/${String(year).slice(2)}`;

      const monthTxs = txs.filter((t) => {
        const td = new Date(t.date);
        return td.getFullYear() === year && td.getMonth() === month;
      });

      const creditos = monthTxs.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
      const debitos = monthTxs.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);

      months.push({ month: label, creditos: Math.round(creditos), debitos: Math.round(debitos) });
    }

    return months;
  }, [data.transactions]);

  const hasData = data.transactions.length > 0;

  if (isLoading) return <ChartSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card rounded-2xl p-5"
    >
      <h3 className="mb-4 text-xs sm:text-sm font-medium text-muted-foreground">
        Comparação Mensal (3 meses)
        {!hasData && <span className="ml-2 text-[10px] text-accent">(exemplo)</span>}
      </h3>
      <div className="min-h-0 min-w-0 relative w-full" style={{ height: 200 }}>
        <ResponsiveContainer width="99%" height="100%">
          <BarChart data={chartData} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "11px",
              }}
              formatter={(value: number, name: string) => [
                formatBRL(value),
                name === "creditos" ? "Créditos" : "Débitos",
              ]}
            />
            <Legend
              formatter={(value) => (value === "creditos" ? "Créditos" : "Débitos")}
              wrapperStyle={{ fontSize: "11px" }}
            />
            <Bar dataKey="creditos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="debitos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
