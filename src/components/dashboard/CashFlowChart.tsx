import { motion } from "framer-motion";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useFinance } from "@/contexts/DataContext";
import { ChartSkeleton } from "./Skeletons";

export const CashFlowChart = () => {
  const { finance, data, isLoading } = useFinance();
  if (isLoading) return <ChartSkeleton />;

  const chartData = finance.cashFlow;
  const limiteSeguranca = data.config.limiteSeguranca;
  const hasProjection = chartData.some((p) => (p as any).projecao !== undefined);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-4 flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-muted-foreground">
            Fluxo de Caixa Preditivo
            {finance.monthTransactions.length === 0 && (
              <span className="ml-2 text-[10px] text-accent">(demo)</span>
            )}
          </h3>
          {hasProjection && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <span className="inline-block h-0" style={{ borderTop: "2px dashed currentColor", width: 14 }} />
              Previsto
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5">
          <div
            className="h-1.5 w-4 rounded-full opacity-80"
            style={{ background: "repeating-linear-gradient(90deg, hsl(var(--destructive)) 0 4px, transparent 4px 7px)" }}
          />
          <span className="text-[10px] font-medium text-destructive">
            Piso R$ {limiteSeguranca.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
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
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString("pt-BR")}`,
                name === "projecao"
                  ? "📅 Previsto"
                  : value < limiteSeguranca
                  ? "⚠️ Abaixo do Piso!"
                  : "Saldo",
              ]}
            />
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
              connectNulls={false}
              isAnimationActive={false}
            />
            {hasProjection && (
              <Line
                type="monotone"
                dataKey="projecao"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
