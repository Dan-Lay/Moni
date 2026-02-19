import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useFinance } from "@/contexts/DataContext";
import { ChartSkeleton } from "./Skeletons";

type TimeFilter = "1M" | "3M" | "6M" | "1A" | "All";

export const CashFlowChart = () => {
  const { finance, data, isLoading } = useFinance();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1M");

  const limiteSeguranca = data.config.limiteSeguranca;

  // Build multi-month data based on filter
  const chartData = useMemo(() => {
    const txs = data.transactions;
    const now = new Date();
    const salary = data.config.salarioLiquido;

    // Calculate how many months back/forward
    const monthsBack: Record<TimeFilter, number> = { "1M": 1, "3M": 3, "6M": 6, "1A": 12, "All": 36 };
    const monthsForward: Record<TimeFilter, number> = { "1M": 0, "3M": 1, "6M": 2, "1A": 3, "All": 12 };
    const back = monthsBack[timeFilter];
    const forward = monthsForward[timeFilter];

    // Gather monthly sums
    const points: { label: string; saldo: number; media3m?: number; projecao?: number }[] = [];

    for (let offset = -back; offset <= forward; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = `${String(month + 1).padStart(2, "0")}/${year}`;

      const monthTxs = txs.filter((t) => {
        const td = new Date(t.date);
        return td.getFullYear() === year && td.getMonth() === month;
      });

      const income = monthTxs.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
      const expenses = monthTxs.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
      const saldo = income > 0 ? income - expenses : salary - expenses * (offset <= 0 ? 1 : 0.9);

      const isPast = offset <= 0;
      points.push({
        label,
        saldo: isPast ? Math.round(saldo) : undefined as any,
        projecao: !isPast ? Math.round(saldo) : undefined,
      });
    }

    // Calculate 3-month rolling average
    for (let i = 0; i < points.length; i++) {
      const slice = points.slice(Math.max(0, i - 2), i + 1).filter((p) => p.saldo != null);
      if (slice.length > 0) {
        points[i].media3m = Math.round(slice.reduce((a, p) => a + (p.saldo ?? 0), 0) / slice.length);
      }
    }

    return points;
  }, [data.transactions, data.config, timeFilter]);

  const filters: TimeFilter[] = ["1M", "3M", "6M", "1A", "All"];

  if (isLoading) return <ChartSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-4 flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-muted-foreground">
            Fluxo de Caixa Preditivo
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "hsl(var(--primary) / 0.3)" }} />
              Média 3M
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0 w-4" style={{ borderTop: "2px dashed hsl(var(--info))" }} />
              Atual/Projetado
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0 w-4" style={{ borderTop: "2px dashed hsl(var(--destructive))" }} />
              Piso
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-secondary p-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all ${
                timeFilter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="media3mGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 62%, 42%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(174, 62%, 42%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              axisLine={false}
              interval="preserveStartEnd"
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
                `R$ ${value?.toLocaleString("pt-BR") ?? "—"}`,
                name === "media3m" ? "Média 3M"
                  : name === "projecao" ? "📅 Projetado"
                  : "Saldo Atual",
              ]}
            />
            <ReferenceLine
              y={limiteSeguranca}
              stroke="hsl(0, 72%, 51%)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              label={{
                value: `Piso R$ ${limiteSeguranca.toLocaleString("pt-BR")}`,
                position: "insideTopRight",
                fill: "hsl(0, 72%, 51%)",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            {/* Filled area: 3-month average */}
            <Area
              type="monotone"
              dataKey="media3m"
              stroke="hsl(174, 62%, 42%)"
              strokeWidth={1}
              fill="url(#media3mGrad)"
              connectNulls
              isAnimationActive={false}
            />
            {/* Actual/current saldo line */}
            <Line
              type="monotone"
              dataKey="saldo"
              stroke="hsl(var(--info))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--info))", r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            {/* Projected dashed line */}
            <Line
              type="monotone"
              dataKey="projecao"
              stroke="hsl(var(--info))"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
