import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useFinance } from "@/contexts/DataContext";
import { ChartSkeleton } from "./Skeletons";

export const CashFlowChart = () => {
  const { finance, data, isLoading } = useFinance();
  if (isLoading) return <ChartSkeleton />;

  const chartData = finance.cashFlow;
  const limiteSeguranca = data.config.limiteSeguranca;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Fluxo de Caixa Preditivo
          {finance.monthTransactions.length === 0 && (
            <span className="ml-2 text-[10px] text-accent">(projeção)</span>
          )}
        </h3>
        <div className="flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5">
          <div className="h-1.5 w-4 rounded-full bg-destructive opacity-80" style={{ background: "repeating-linear-gradient(90deg, hsl(var(--destructive)) 0 4px, transparent 4px 7px)" }} />
          <span className="text-[10px] font-medium text-destructive">
            Piso R$ {limiteSeguranca.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="dia"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "12px",
              }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString("pt-BR")}`,
                value < limiteSeguranca ? "⚠️ Abaixo do Piso!" : "Saldo",
              ]}
            />
            {/* Safety floor reference line */}
            <ReferenceLine
              y={limiteSeguranca}
              stroke="hsl(0, 72%, 51%)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              label={{
                value: "Piso",
                position: "insideTopRight",
                fill: "hsl(0, 72%, 51%)",
                fontSize: 10,
                fontWeight: 600,
              }}
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
