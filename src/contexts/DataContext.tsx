import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  AppData, Transaction, FinancialConfig, DesapegoItem, PlannedEntry,
  EfficiencyStats, MonthSummary, EstablishmentRank,
  SpouseProfile,
} from "@/lib/types";
import {
  loadAppData, addTransactions as addTxs, updateConfig as updCfg,
  updateDesapego as updDesapego, updateJantares as updJantares,
  addPlannedEntry as addPE, updatePlannedEntry as updatePE, deletePlannedEntry as deletePE,
  getCurrentMonthTransactions, efficiencyStats, getMonthSummary,
  buildCashFlowProjection, CashFlowPointExtended, topEstablishments, totalMilesFromTransactions,
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
  readonly cashFlow: CashFlowPointExtended[];
  readonly topEstablishments: EstablishmentRank[];
  readonly totalMilesEarned: number;
  readonly categoryBreakdown: Record<string, number>;
}

export type ProfileFilter = SpouseProfile | "todos";

interface FinanceContextType {
  data: AppData;
  finance: FinanceState;
  isLoading: boolean;
  profileFilter: ProfileFilter;
  setProfileFilter: (p: ProfileFilter) => void;
  addTransactions: (txs: Transaction[]) => void;
  updateConfig: (partial: Partial<FinancialConfig>) => void;
  updateDesapego: (items: DesapegoItem[]) => void;
  updateJantares: (count: number) => void;
  addPlannedEntry: (e: PlannedEntry) => void;
  updatePlannedEntry: (id: string, patch: Partial<PlannedEntry>) => void;
  deletePlannedEntry: (id: string) => void;
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

function computeFinance(data: AppData, profile: ProfileFilter): FinanceState {
  const monthTxs = getCurrentMonthTransactions(data.transactions);
  return {
    salarioLiquido: data.config.salarioLiquido,
    milhasAtuais: data.config.milhasAtuais,
    metaDisney: data.config.metaDisney,
    monthTransactions: monthTxs,
    efficiency: efficiencyStats(monthTxs),
    monthSummary: getMonthSummary(data.transactions, data.config),
    cashFlow: buildCashFlowProjection(data.transactions, data.config, data.plannedEntries ?? []),
    topEstablishments: topEstablishments(monthTxs, 5, profile),
    totalMilesEarned: totalMilesFromTransactions(data.transactions),
    categoryBreakdown: sumByCategory(monthTxs, profile),
  };
}

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AppData>(loadAppData);
  const [isLoading, setIsLoading] = useState(true);
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>(() => {
    const saved = localStorage.getItem("finwar_user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.defaultProfile) return parsed.defaultProfile as ProfileFilter;
      } catch {}
    }
    return "todos";
  });

  // Simulate initial load (for skeleton UX)
  useState(() => {
    setTimeout(() => setIsLoading(false), 800);
  });

  const finance = computeFinance(data, profileFilter);

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

  const handleAddPlannedEntry = useCallback((entry: PlannedEntry) => {
    const updated = addPE(entry);
    setData({ ...updated });
  }, []);

  const handleUpdatePlannedEntry = useCallback((id: string, patch: Partial<PlannedEntry>) => {
    const updated = updatePE(id, patch);
    setData({ ...updated });
  }, []);

  const handleDeletePlannedEntry = useCallback((id: string) => {
    const updated = deletePE(id);
    setData({ ...updated });
  }, []);

  const reload = useCallback(() => {
    setIsLoading(true);
    setData(loadAppData());
    setTimeout(() => setIsLoading(false), 400);
  }, []);

  return (
    <FinanceContext.Provider
      value={{
        data, finance, isLoading,
        profileFilter, setProfileFilter,
        addTransactions, updateConfig, updateDesapego, updateJantares,
        addPlannedEntry: handleAddPlannedEntry,
        updatePlannedEntry: handleUpdatePlannedEntry,
        deletePlannedEntry: handleDeletePlannedEntry,
        reload,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

// Re-export as DataProvider for backward compat
export const DataProvider = FinanceProvider;
