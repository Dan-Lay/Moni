import { Plane, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { totalMilesFromTransactions } from "@/lib/storage";
import { CardSkeleton } from "./Skeletons";
import { formatMiles } from "@/lib/types";

export const DisneyThermometer = () => {
  const { data, finance, isLoading } = useFinance();
  if (isLoading) return <CardSkeleton hasBar hasGrid />;

  const { milhasAtuais, metaDisney } = data.config;
  const milhasFatura = totalMilesFromTransactions(finance.monthTransactions);
  const milhasHistoricas = finance.totalMilesEarned - milhasFatura;
  const totalAtual = milhasAtuais + milhasHistoricas + milhasFatura;
  const percent = (totalAtual / metaDisney) * 100;
  const restantes = metaDisney - totalAtual;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4" style={{ color: 'hsl(40 40% 55%)' }} />
          <h3 className="text-sm font-semibold text-foreground">Termometro Disney 2028</h3>
        </div>
        <Sparkles className="h-4 w-4" style={{ color: 'hsl(40 40% 75%)' }} />
      </div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold text-gradient-gold">{formatMiles(totalAtual)}</span>
        <span className="text-sm text-muted-foreground">/ {(metaDisney / 1000).toFixed(0)}k milhas</span>
      </div>
      <div className="mb-3 mt-4 h-3 overflow-hidden rounded-full bg-muted">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percent, 100)}%` }} transition={{ duration: 1.5 }} className="relative h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(40 40% 55%), hsl(40 40% 70%))" }}>
          <div className="absolute right-1 top-1/2 -translate-y-1/2"><Plane className="h-2.5 w-2.5 text-accent-foreground" /></div>
        </motion.div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{percent.toFixed(1)}% concluído</span>
        <span>{formatMiles(Math.max(restantes, 0))} restantes</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted px-3 py-2.5 text-center">
          <p className="font-mono text-sm font-semibold text-foreground">{formatMiles(milhasAtuais)}</p>
          <p className="text-[10px] text-muted-foreground">Iniciais</p>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2.5 text-center">
          <p className="font-mono text-sm font-semibold text-primary">+{formatMiles(milhasFatura)}</p>
          <p className="text-[10px] text-muted-foreground">Fatura atual</p>
        </div>
      </div>
    </motion.div>
  );
};
