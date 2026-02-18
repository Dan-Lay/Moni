import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { dia: "01", saldo: 12000 },
  { dia: "05", saldo: 11200 },
  { dia: "08", saldo: 10800 },
  { dia: "10", saldo: 9500 },
  { dia: "12", saldo: 9200 },
  { dia: "15", saldo: 8800 },
  { dia: "18", saldo: 8100 },
  { dia: "20", saldo: 7600 },
  { dia: "22", saldo: 7200 },
  { dia: "25", saldo: 6800 },
  { dia: "28", saldo: 6400 },
  { dia: "30", saldo: 5900 },
];

export const CashFlowChart = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl p-5"
    >
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Fluxo de Caixa Preditivo</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="dia" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Saldo"]}
            />
            <Area
              type="monotone"
              dataKey="saldo"
              stroke="hsl(160, 84%, 39%)"
              strokeWidth={2}
              fill="url(#saldoGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
