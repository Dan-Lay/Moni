import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Supermercado", value: 2200, color: "hsl(160, 84%, 39%)" },
  { name: "Fixas", value: 3500, color: "hsl(200, 80%, 50%)" },
  { name: "Ajuda Mãe", value: 800, color: "hsl(280, 65%, 60%)" },
  { name: "Lazer", value: 600, color: "hsl(43, 96%, 56%)" },
  { name: "Investimentos", value: 1450, color: "hsl(160, 84%, 55%)" },
  { name: "Outros", value: 950, color: "hsl(340, 75%, 55%)" },
];

export const ExpensePieChart = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-5"
    >
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Gastos por Categoria</h3>
      <div className="flex items-center gap-4">
        <div className="h-44 w-44 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
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
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
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
