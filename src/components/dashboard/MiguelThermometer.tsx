import { Plane, Euro, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { CardSkeleton } from "./Skeletons";

export const MiguelThermometer = () => {
  const { data, isLoading } = useFinance();
  if (isLoading) return <CardSkeleton hasBar hasGrid />;

  const {
    cotacaoEuro,
    reservaEUR,
    metaMiguelEUR = 3000,
    reservaBRLParaMiguel = 5000,
  } = data.config as any;

  // Convert BRL reserve to EUR at today's rate
  const brlEmEuro = cotacaoEuro > 0 ? reservaBRLParaMiguel / cotacaoEuro : 0;
  const totalEUR = reservaEUR + brlEmEuro;
  const percent = (totalEUR / metaMiguelEUR) * 100;
  const restantes = metaMiguelEUR - totalEUR;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card glow-primary rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-info" />
          <h3 className="text-sm font-medium text-info">Miguel 2027 🇪🇺→🇧🇷</h3>
        </div>
        <Sparkles className="h-4 w-4 text-info animate-pulse-glow" />
      </div>

      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold text-gradient-primary">
          €{totalEUR.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
        </span>
        <span className="text-sm text-muted-foreground">/ €{metaMiguelEUR.toLocaleString()}</span>
      </div>

      <div className="mb-3 mt-4 h-4 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percent, 100)}%` }}
          transition={{ duration: 1.5 }}
          className="relative h-full rounded-full"
          style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--info)))" }}
        >
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <Euro className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        </motion.div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{percent.toFixed(1)}% concluído</span>
        <span>€{Math.max(restantes, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} restantes</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-secondary/50 px-3 py-2 text-center">
          <p className="font-mono text-sm font-semibold">€{reservaEUR.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Em conta (EUR)</p>
        </div>
        <div className="rounded-lg bg-secondary/50 px-3 py-2 text-center">
          <p className="font-mono text-sm font-semibold text-primary">
            +€{brlEmEuro.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-muted-foreground">BRL convertido</p>
        </div>
      </div>
    </motion.div>
  );
};
