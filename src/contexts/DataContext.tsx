import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  AppData, Transaction, FinancialConfig, DesapegoItem,
  EfficiencyStats, MonthSummary, CashFlowPoint, EstablishmentRank,
} from "@/lib/types";
import {
  loadAppData, addTransactions as addTxs, updateConfig as updCfg,
  updateDesapego as updDesapego, updateJantares as updJantares,
  getCurrentMonthTransactions, efficiencyStats, getMonthSummary,
  buildCashFlowProjection, topEstablishments, totalMilesFromTransactions,
  sumByCategory,
} from "@/lib/storage";

// ── Computed finance state ──
interface FinanceState {
  readonly salarioLiquido: number;
  readonly milhasAtuais: number;
  readonly metaDisney: number;
  readonly monthTransactions: Transaction[];
  readonly efficiency: EfficiencyStats;
  readonly monthSummary: MonthSummary;
  readonly cashFlow: CashFlowPoint[];
  readonly topEstablishments: EstablishmentRank[];
  readonly totalMilesEarned: number;
  readonly categoryBreakdown: Record<string, number>;
}

interface FinanceContextType {
  data: AppData;
  finance: FinanceState;
  isLoading: boolean;
  addTransactions: (txs: Transaction[]) => void;
  updateConfig: (partial: Partial<FinancialConfig>) => void;
  updateDesapego: (items: DesapegoItem[]) => void;
  updateJantares: (count: number) => void;
  reload: () => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
};

// Keep backward compat
export const useAppData = useFinance;

function computeFinance(data: AppData): FinanceState {
  const monthTxs = getCurrentMonthTransactions(data.transactions);
  return {
    salarioLiquido: data.config.salarioLiquido,
    milhasAtuais: data.config.milhasAtuais,
    metaDisney: data.config.metaDisney,
    monthTransactions: monthTxs,
    efficiency: efficiencyStats(monthTxs),
    monthSummary: getMonthSummary(data.transactions, data.config),
    cashFlow: buildCashFlowProjection(data.transactions, data.config),
    topEstablishments: topEstablishments(monthTxs, 5),
    totalMilesEarned: totalMilesFromTransactions(data.transactions),
    categoryBreakdown: sumByCategory(monthTxs),
  };
}

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AppData>(loadAppData);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial load (for skeleton UX)
  useState(() => {
    setTimeout(() => setIsLoading(false), 800);
  });

  const finance = computeFinance(data);

  const addTransactions = useCallback((txs: Transaction[]) => {
    const updated = addTxs(txs);
    setData({ ...updated });
  }, []);

  const updateConfig = useCallback((partial: Partial<FinancialConfig>) => {
    const updated = updCfg(partial);
    setData({ ...updated });
  }, []);

  const updateDesapego = useCallback((items: DesapegoItem[]) => {
    const updated = updDesapego(items);
    setData({ ...updated });
  }, []);

  const updateJantares = useCallback((count: number) => {
    const updated = updJantares(count);
    setData({ ...updated });
  }, []);

  const reload = useCallback(() => {
    setIsLoading(true);
    setData(loadAppData());
    setTimeout(() => setIsLoading(false), 400);
  }, []);

  return (
    <FinanceContext.Provider value={{ data, finance, isLoading, addTransactions, updateConfig, updateDesapego, updateJantares, reload }}>
      {children}
    </FinanceContext.Provider>
  );
};

// Re-export as DataProvider for backward compat
export const DataProvider = FinanceProvider;
