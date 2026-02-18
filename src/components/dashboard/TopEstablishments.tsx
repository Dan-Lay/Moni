import { Store } from "lucide-react";
import { motion } from "framer-motion";
import { useAppData } from "@/contexts/DataContext";
import { topEstablishments as getTopEst, getCurrentMonthTransactions } from "@/lib/storage";

const DEMO = [
  { name: "Assaí Atacadista", amount: 1240 },
  { name: "Shell Combustível", amount: 890 },
  { name: "iFood", amount: 560 },
  { name: "Drogaria SP", amount: 420 },
  { name: "Amazon BR", amount: 380 },
];

export const TopEstablishments = () => {
  const { data } = useAppData();
  const monthTxs = getCurrentMonthTransactions(data.transactions);
  const live = getTopEst(monthTxs, 5);
  const establishments = live.length > 0 ? live : DEMO;
  const maxAmount = establishments[0]?.amount || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <Store className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Top 5 Estabelecimentos
          {live.length === 0 && <span className="ml-2 text-[10px] text-accent">(exemplo)</span>}
        </h3>
      </div>

      <div className="space-y-3">
        {establishments.map((est, i) => (
          <div key={est.name}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{est.name}</span>
              </div>
              <span className="font-mono text-sm font-semibold">
                R$ {est.amount.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(est.amount / maxAmount) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                className="h-full rounded-full bg-primary/60"
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
