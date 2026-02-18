import { Store, User } from "lucide-react";
import { motion } from "framer-motion";
import { useFinance } from "@/contexts/DataContext";
import { ListSkeleton } from "./Skeletons";
import { TransactionDetailPanel } from "./TransactionDetailPanel";
import { useState } from "react";

const DEMO = [
  { name: "Assaí Atacadista", amount: 1240, transactionCount: 4 },
  { name: "Shell Combustível", amount: 890, transactionCount: 3 },
  { name: "iFood", amount: 560, transactionCount: 8 },
  { name: "Drogaria SP", amount: 420, transactionCount: 2 },
  { name: "Amazon BR", amount: 380, transactionCount: 1 },
];

export const TopEstablishments = () => {
  const { finance, isLoading, profileFilter } = useFinance();
  const [expandedEst, setExpandedEst] = useState<string | null>(null);
  if (isLoading) return <ListSkeleton />;

  const live = finance.topEstablishments;
  const establishments = live.length > 0 ? live : DEMO;
  const maxAmount = establishments[0]?.amount || 1;
  const hasData = live.length > 0;

  const profileLabel: Record<string, string> = {
    todos: "Família",
    marido: "Marido",
    esposa: "Esposa",
    familia: "Família",
  };

  // Get transactions for an establishment
  const getEstTxs = (estName: string) =>
    finance.monthTransactions.filter(
      (t) => t.amount < 0 && t.establishment?.toLowerCase() === estName.toLowerCase()
    );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Top 5 Estabelecimentos
            {!hasData && <span className="ml-2 text-[10px] text-accent">(exemplo)</span>}
          </h3>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{profileLabel[profileFilter] ?? "Família"}</span>
        </div>
      </div>
      <div className="space-y-3">
        {establishments.map((est, i) => {
          const estTxs = hasData ? getEstTxs(est.name) : [];
          const isExpanded = expandedEst === est.name;
          return (
            <div key={est.name}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                  <span className="text-sm font-medium">{est.name}</span>
                </div>
                <span className="font-mono text-sm font-semibold">R$ {est.amount.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-secondary">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(est.amount / maxAmount) * 100}%` }} transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }} className="h-full rounded-full bg-primary/60" />
              </div>
              {hasData && estTxs.length > 0 && (
                <TransactionDetailPanel
                  transactions={estTxs}
                  label={est.name}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
