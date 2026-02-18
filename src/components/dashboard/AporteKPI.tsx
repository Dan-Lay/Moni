import { TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useAppData } from "@/contexts/DataContext";

export const AporteKPI = () => {
  const { data } = useAppData();
  const { salario, aportePercentual } = data.config;
  const meta = salario * (aportePercentual / 100);

  // Count "investimentos" category + desapego sold items
  const investido = data.transactions
    .filter((t) => t.category === "investimentos" && t.amount < 0)
    .reduce((a, t) => a + Math.abs(t.amount), 0);

  const desapegoVendido = data.desapegoItems
    .filter((i) => i.sold)
    .reduce((a, i) => a + i.value, 0);

  const totalAporte = investido + desapegoVendido;
  const percent = meta > 0 ? (totalAporte / meta) * 100 : 0;
  const falta = meta - totalAporte;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Aporte Mensal ({aportePercentual}%)</h3>
        <Target className="h-4 w-4 text-primary" />
      </div>

      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold">
          R$ {totalAporte.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
        </span>
        <span className="text-sm text-muted-foreground">
          / R$ {meta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className="mb-2 mt-4 h-3 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percent, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full bg-primary"
        />
      </div>

      <div className="flex justify-between text-xs">
        <span className={percent >= 100 ? "text-primary font-semibold" : "text-muted-foreground"}>
          {percent.toFixed(0)}% da meta
        </span>
        {falta > 0 ? (
          <span className="text-warning font-mono">Faltam R$ {falta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
        ) : (
          <span className="flex items-center gap-1 text-primary">
            <TrendingUp className="h-3 w-3" /> Meta atingida!
          </span>
        )}
      </div>
    </motion.div>
  );
};
