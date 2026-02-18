import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { CardSkeleton } from "./Skeletons";

export const DollarDisney = () => {
  const { data, isLoading } = useFinance();
  if (isLoading) return <CardSkeleton hasBar hasGrid />;

  const { cotacaoDolar, cotacaoMediaDCA, reservaUSD, metaUSD } = data.config;
  const diff = ((cotacaoDolar - cotacaoMediaDCA) / cotacaoMediaDCA) * 100;
  const deveComprar = cotacaoDolar < cotacaoMediaDCA;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-info" />
          <h3 className="text-sm font-medium text-muted-foreground">Dólar Disney</h3>
        </div>
        {deveComprar && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">COMPRAR</span>
        )}
      </div>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-2xl font-bold">R$ {cotacaoDolar.toFixed(2)}</span>
        <span className={`flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? "text-destructive" : "text-primary"}`}>
          {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(diff).toFixed(1)}% vs média
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-secondary/50 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Média DCA</p>
          <p className="font-mono text-sm font-semibold">R$ {cotacaoMediaDCA.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-secondary/50 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Reserva USD</p>
          <p className="font-mono text-sm font-semibold">${reservaUSD.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div initial={{ width: 0 }} animate={{ width: `${(reservaUSD / metaUSD) * 100}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-info" />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">${reservaUSD} / ${metaUSD.toLocaleString()} meta Orlando</p>
    </motion.div>
  );
};
