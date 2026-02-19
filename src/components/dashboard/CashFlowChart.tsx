import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useFinance } from "@/contexts/DataContext";
import { ChartSkeleton } from "./Skeletons";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { formatBRL } from "@/lib/types";

type TimeFilter = "1M" | "3M" | "6M" | "1A" | "All";

export const CashFlowChart = () => {
  const { finance, data, isLoading } = useFinance();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1M");

  const limiteSeguranca = data.config.limiteSeguranca;

  const isShortRange = timeFilter === "1M" || timeFilter === "3M";

  // Build chart data with dynamic granularity
  const { chartData, periodSpent, avg3mSpent, crossesFloor } = useMemo(() => {
    const txs = data.transactions;
    const now = new Date();
    const salary = data.config.salarioLiquido;

    const monthsBack: Record<TimeFilter, number> = { "1M": 1, "3M": 3, "6M": 6, "1A": 12, "All": 36 };
    const monthsForward: Record<TimeFilter, number> = { "1M": 0, "3M": 1, "6M": 2, "1A": 3, "All": 12 };
    const back = monthsBack[timeFilter];
    const forward = monthsForward[timeFilter];

    if (isShortRange) {
      // Daily granularity
      const startDate = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + forward + 1, 0);
      const points: { label: string; saldo?: number; media?: number; projecao?: number; piso: number }[] = [];

      let runSaldo = salary;
      let totalSpent = 0;
      let dayCount = 0;

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const dayTxs = txs.filter((t) => t.date === dateStr);
        const dayDelta = dayTxs.reduce((a, t) => a + t.amount, 0);
        const isPast = d <= now;

        if (isPast) {
          runSaldo += dayDelta;
          const expenses = dayTxs.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
          totalSpent += expenses;
        }

        dayCount++;
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

        // Only push every other day or significant days to avoid clutter
        if (dayCount % (back <= 1 ? 1 : 2) === 0 || dayTxs.length > 0 || d.getDate() === 1) {
          points.push({
            label,
            saldo: isPast ? Math.round(runSaldo) : undefined,
            projecao: !isPast ? Math.round(runSaldo * 0.95) : undefined,
            piso: limiteSeguranca,
          });
        }
      }

      // Compute rolling average for area
      for (let i = 0; i < points.length; i++) {
        const slice = points.slice(Math.max(0, i - 6), i + 1).filter((p) => p.saldo != null);
        if (slice.length > 0) {
          points[i].media = Math.round(slice.reduce((a, p) => a + (p.saldo ?? 0), 0) / slice.length);
        }
      }

      // 3-month avg expenses
      const now3m = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const past3mTxs = txs.filter((t) => {
        const td = new Date(t.date);
        return td >= now3m && td <= now && t.amount < 0;
      });
      const avg3m = past3mTxs.reduce((a, t) => a + Math.abs(t.amount), 0) / 3;

      const crosses = points.some((p) => (p.projecao ?? p.saldo ?? Infinity) < limiteSeguranca);

      return { chartData: points, periodSpent: totalSpent, avg3mSpent: avg3m, crossesFloor: crosses };
    } else {
      // Weekly granularity for 6M+
      const points: { label: string; saldo?: number; media?: number; projecao?: number; piso: number }[] = [];
      let totalSpent = 0;

      for (let offset = -back; offset <= forward; offset++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

        // Split month into ~4 weeks
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const weekBounds = [1, 8, 15, 22];

        for (let wi = 0; wi < weekBounds.length; wi++) {
          const wStart = weekBounds[wi];
          const wEnd = wi < weekBounds.length - 1 ? weekBounds[wi + 1] - 1 : daysInMonth;

          const weekTxs = txs.filter((t) => {
            const td = new Date(t.date);
            return td.getFullYear() === year && td.getMonth() === month && td.getDate() >= wStart && td.getDate() <= wEnd;
          });

          const income = weekTxs.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
          const expenses = weekTxs.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
          const isPast = offset <= 0;

          if (isPast) totalSpent += expenses;

          const saldo = income > 0 ? income - expenses : (salary / 4) - expenses * (isPast ? 1 : 0.9);
          const label = `S${wi + 1} ${monthNames[month]}`;

          points.push({
            label,
            saldo: isPast ? Math.round(saldo) : undefined,
            projecao: !isPast ? Math.round(saldo) : undefined,
            piso: limiteSeguranca,
          });
        }
      }

      // Rolling average
      for (let i = 0; i < points.length; i++) {
        const slice = points.slice(Math.max(0, i - 4), i + 1).filter((p) => p.saldo != null);
        if (slice.length > 0) {
          points[i].media = Math.round(slice.reduce((a, p) => a + (p.saldo ?? 0), 0) / slice.length);
        }
      }

      const now3m = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const past3mTxs = txs.filter((t) => {
        const td = new Date(t.date);
        return td >= now3m && td <= now && t.amount < 0;
      });
      const avg3m = past3mTxs.reduce((a, t) => a + Math.abs(t.amount), 0) / 3;

      const crosses = points.some((p) => (p.projecao ?? p.saldo ?? Infinity) < limiteSeguranca);

      return { chartData: points, periodSpent: totalSpent, avg3mSpent: avg3m, crossesFloor: crosses };
    }
  }, [data.transactions, data.config, timeFilter, isShortRange, limiteSeguranca]);

  // Trend calculation
  const trendInfo = useMemo(() => {
    if (avg3mSpent === 0) return { type: "stable" as const, diff: 0, percent: 0 };
    const diff = periodSpent - avg3mSpent;
    const percent = (diff / avg3mSpent) * 100;
    if (percent > 5) return { type: "up" as const, diff, percent };
    if (percent < -5) return { type: "down" as const, diff, percent };
    return { type: "stable" as const, diff, percent };
  }, [periodSpent, avg3mSpent]);

  const filters: TimeFilter[] = ["1M", "3M", "6M", "1A", "All"];

  if (isLoading) return <ChartSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-5"
    >
      {/* Performance Header */}
      <div className="mb-3 flex items-center gap-2 sm:gap-4 flex-wrap min-w-0">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Gasto neste período</p>
          <p className="text-base sm:text-lg font-bold text-foreground">{formatBRL(periodSpent)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {trendInfo.type === "up" && (
            <>
              <div className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5">
                <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                <span className="text-[11px] font-semibold text-destructive">
                  +{formatBRL(Math.abs(trendInfo.diff))}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">vs média 3M</span>
            </>
          )}
          {trendInfo.type === "down" && (
            <>
              <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-500">
                  -{formatBRL(Math.abs(trendInfo.diff))}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">vs média 3M</span>
            </>
          )}
          {trendInfo.type === "stable" && (
            <>
              <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5">
                <Minus className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-semibold text-amber-500">Estável</span>
              </div>
              <span className="text-[10px] text-muted-foreground">vs média 3M</span>
            </>
          )}
        </div>

        {crossesFloor && (
          <div className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 ml-auto">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-semibold text-destructive">
              Atenção: saldo insuficiente no futuro próximo
            </span>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
            Fluxo de Caixa Preditivo
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "hsl(174, 62%, 42%, 0.3)" }} />
              Média
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0 w-3" style={{ borderTop: "2px solid hsl(var(--info))" }} />
              Atual
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0 w-3" style={{ borderTop: "2px dashed hsl(var(--info))" }} />
              Projeção
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0 w-3" style={{ borderTop: "2px dashed hsl(var(--destructive))" }} />
              Piso
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5 flex-shrink-0">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${
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

      <div className="flex-1 min-h-0 min-w-0 relative w-full">
        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="mediaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 62%, 42%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(174, 62%, 42%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              axisLine={false}
              interval={isShortRange ? "preserveStartEnd" : Math.floor(chartData.length / 8)}
              angle={isShortRange ? 0 : -30}
              textAnchor={isShortRange ? "middle" : "end"}
              height={isShortRange ? 30 : 40}
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
                name === "media" ? "Média"
                  : name === "projecao" ? "📅 Projetado"
                  : name === "piso" ? "🔴 Piso"
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
            <Area
              type="monotone"
              dataKey="media"
              stroke="hsl(174, 62%, 42%)"
              strokeWidth={1}
              fill="url(#mediaGrad)"
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              stroke="hsl(var(--info))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--info))", r: 2 }}
              connectNulls
              isAnimationActive={false}
            />
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
