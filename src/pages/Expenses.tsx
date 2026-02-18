import { AppLayout } from "@/components/layout/AppLayout";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { TopEstablishments } from "@/components/dashboard/TopEstablishments";
import { useAppData } from "@/contexts/DataContext";
import { getCurrentMonthTransactions } from "@/lib/storage";
import { motion } from "framer-motion";
import { Receipt, AlertTriangle } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  supermercado: "Supermercado", alimentacao: "Alimentação", transporte: "Transporte",
  ajuda_mae: "Ajuda Mãe", saude: "Saúde", lazer: "Lazer",
  investimentos: "Investimentos", fixas: "Fixas", compras: "Compras", outros: "Outros",
};

const Expenses = () => {
  const { data } = useAppData();
  const monthTxs = getCurrentMonthTransactions(data.transactions);
  const debits = monthTxs.filter((t) => t.amount < 0);

  return (
    <AppLayout>
      <h1 className="mb-6 text-xl font-bold">Gastos do Mês</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExpensePieChart />
        <TopEstablishments />
      </div>

      {/* Transaction list */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Receipt className="h-4 w-4" />
          Últimas Transações ({debits.length})
        </h2>

        {debits.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">
            Nenhuma transação importada ainda. Vá em <strong>Upload</strong> para importar extratos.
          </div>
        ) : (
          <div className="space-y-2">
            {debits.slice(0, 20).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="glass-card flex items-center justify-between rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.establishment || t.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{t.date}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium">
                      {CATEGORY_LABELS[t.category] || t.category}
                    </span>
                    {t.isInefficient && (
                      <span className="flex items-center gap-0.5 text-[10px] text-accent">
                        <AlertTriangle className="h-2.5 w-2.5" /> Ineficiente
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p className="font-mono text-sm font-semibold text-destructive">
                    -R$ {Math.abs(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  {t.milesGenerated > 0 && (
                    <p className="text-[10px] text-accent font-mono">+{t.milesGenerated} milhas</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Expenses;
