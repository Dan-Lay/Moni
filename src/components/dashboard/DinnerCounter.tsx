import { UtensilsCrossed, Clapperboard } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { CardSkeleton } from "./Skeletons";

export const DinnerCounter = () => {
  const { data, isLoading, updateJantares, updateCinemas } = useFinance();
  if (isLoading) return <CardSkeleton lines={1} hasBar={false} />;

  const { maxJantaresMes, maxGastoJantar, maxCinemasMes, maxGastoCinema } = data.config;
  const jantaresRestantes = maxJantaresMes - data.jantaresUsados;
  const cinemasRestantes = maxCinemasMes - data.cinemasUsados;

  const toggleJantar = (index: number) => {
    const isUsed = index >= jantaresRestantes;
    if (isUsed) {
      // Unmark: decrease used count
      updateJantares(data.jantaresUsados - 1);
    } else {
      // Mark as used
      updateJantares(data.jantaresUsados + 1);
    }
  };

  const toggleCinema = (index: number) => {
    const isUsed = index >= cinemasRestantes;
    if (isUsed) {
      updateCinemas(data.cinemasUsados - 1);
    } else {
      updateCinemas(data.cinemasUsados + 1);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Entretenimento</h3>
      </div>

      {/* Jantares */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Jantares</span>
          <span className="text-[10px] text-muted-foreground">máx R$ {maxGastoJantar}/jantar</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          {Array.from({ length: maxJantaresMes }).map((_, i) => {
            const ativo = i < jantaresRestantes;
            return (
              <motion.button
                key={`j-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                onClick={() => toggleJantar(i)}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all cursor-pointer ${ativo ? "bg-primary/15 text-primary glow-primary" : "bg-secondary/50 text-muted-foreground/30"}`}
              >
                <UtensilsCrossed className={`h-6 w-6 ${!ativo && "opacity-30"}`} />
              </motion.button>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          {jantaresRestantes > 0 ? `${jantaresRestantes} jantar${jantaresRestantes > 1 ? "es" : ""} disponível` : "Limite atingido 🛑"}
        </p>
      </div>

      {/* Cinema */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Cinema</span>
          <span className="text-[10px] text-muted-foreground">máx R$ {maxGastoCinema}/ingresso</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          {Array.from({ length: maxCinemasMes }).map((_, i) => {
            const ativo = i < cinemasRestantes;
            return (
              <motion.button
                key={`c-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                onClick={() => toggleCinema(i)}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all cursor-pointer ${ativo ? "bg-accent/15 text-accent glow-primary" : "bg-secondary/50 text-muted-foreground/30"}`}
              >
                <Clapperboard className={`h-6 w-6 ${!ativo && "opacity-30"}`} />
              </motion.button>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          {cinemasRestantes > 0 ? `${cinemasRestantes} ingresso${cinemasRestantes > 1 ? "s" : ""} disponível` : "Limite atingido 🛑"}
        </p>
      </div>
    </motion.div>
  );
};
