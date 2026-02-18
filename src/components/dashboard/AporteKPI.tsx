import { TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";

export const AporteKPI = () => {
  const salario = 12000;
  const meta = salario * 0.15; // 1800
  const investido = 1450;
  const percent = (investido / meta) * 100;
  const falta = meta - investido;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Aporte Mensal (15%)</h3>
        <Target className="h-4 w-4 text-primary" />
      </div>

      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold">
          R$ {investido.toLocaleString("pt-BR")}
        </span>
        <span className="text-sm text-muted-foreground">
          / R$ {meta.toLocaleString("pt-BR")}
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
          <span className="text-warning font-mono">Faltam R$ {falta.toLocaleString("pt-BR")}</span>
        ) : (
          <span className="flex items-center gap-1 text-primary">
            <TrendingUp className="h-3 w-3" /> Meta atingida!
          </span>
        )}
      </div>
    </motion.div>
  );
};
