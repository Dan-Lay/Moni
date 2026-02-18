import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAppData } from "@/contexts/DataContext";
import { sumByCategory, getCurrentMonthTransactions } from "@/lib/storage";

const CATEGORY_LABELS: Record<string, string> = {
  supermercado: "Supermercado",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  ajuda_mae: "Ajuda Mãe",
  saude: "Saúde",
  lazer: "Lazer",
  investimentos: "Investimentos",
  fixas: "Fixas",
  compras: "Compras",
  outros: "Outros",
};

const COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(200, 80%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(43, 96%, 56%)",
  "hsl(160, 84%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(20, 80%, 55%)",
  "hsl(100, 60%, 45%)",
  "hsl(240, 50%, 55%)",
  "hsl(0, 60%, 50%)",
];

const DEMO_DATA = [
  { name: "Supermercado", value: 2200 },
  { name: "Fixas", value: 3500 },
  { name: "Ajuda Mãe", value: 800 },
  { name: "Lazer", value: 600 },
  { name: "Investimentos", value: 1450 },
  { name: "Outros", value: 950 },
];

export const ExpensePieChart = () => {
  const { data: appData } = useAppData();
  const monthTxs = getCurrentMonthTransactions(appData.transactions);
  const byCategory = sumByCategory(monthTxs);

  const chartData = Object.keys(byCategory).length > 0
    ? Object.entries(byCategory).map(([cat, val]) => ({
        name: CATEGORY_LABELS[cat] || cat,
        value: Math.round(val),
      }))
    : DEMO_DATA;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-5"
    >
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
        Gastos por Categoria
        {Object.keys(byCategory).length === 0 && (
          <span className="ml-2 text-[10px] text-accent">(dados de exemplo)</span>
        )}
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
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-mono font-medium">R$ {item.value.toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
