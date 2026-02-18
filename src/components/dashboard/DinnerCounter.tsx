import { UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";

export const DinnerCounter = () => {
  const maxJantares = 2;
  const usados = 1;
  const restantes = maxJantares - usados;
  const maxGasto = 250; // valor máximo por jantar

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Jantares Restantes</h3>
        <span className="text-[10px] text-muted-foreground">máx R$ {maxGasto}/jantar</span>
      </div>

      <div className="flex items-center justify-center gap-6 py-3">
        {Array.from({ length: maxJantares }).map((_, i) => {
          const ativo = i < restantes;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all ${
                ativo
                  ? "bg-primary/15 text-primary glow-primary"
                  : "bg-secondary/50 text-muted-foreground/30"
              }`}
            >
              <UtensilsCrossed className={`h-7 w-7 ${!ativo && "opacity-30"}`} />
            </motion.div>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {restantes > 0
          ? `${restantes} jantar${restantes > 1 ? "es" : ""} disponível este mês`
          : "Limite de lazer atingido 🛑"}
      </p>
    </motion.div>
  );
};
