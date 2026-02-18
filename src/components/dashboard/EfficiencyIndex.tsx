import { Zap, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAppData } from "@/contexts/DataContext";
import { efficiencyStats, getCurrentMonthTransactions } from "@/lib/storage";

export const EfficiencyIndex = () => {
  const { data } = useAppData();
  const monthTxs = getCurrentMonthTransactions(data.transactions);
  const stats = efficiencyStats(monthTxs);

  const hasData = stats.totalSpent > 0;
  const eficiencia = hasData ? stats.efficiency : 82; // demo fallback
  const milhasPerdidas = hasData ? stats.lostMiles : 680;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-medium text-muted-foreground">Eficiência AAdvantage</h3>
        </div>
        {!hasData && <span className="text-[10px] text-accent">demo</span>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-3xl font-bold ${eficiencia >= 90 ? "text-primary" : "text-accent"}`}>
          {eficiencia.toFixed(0)}%
        </span>
        <span className="text-xs text-muted-foreground">dos gastos no Santander</span>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${eficiencia}%` }}
          transition={{ duration: 1 }}
          className="h-full rounded-full"
          style={{
            background: eficiencia >= 90
              ? "hsl(var(--primary))"
              : "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--destructive)))",
          }}
        />
      </div>

      {eficiencia < 90 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-accent/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent" />
          <p className="text-xs text-accent">
            Você deixou de ganhar <strong className="font-mono">{milhasPerdidas.toLocaleString()}</strong> milhas usando o cartão errado.
          </p>
        </div>
      )}
    </motion.div>
  );
};
