import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import {
  AppData, Transaction, FinancialConfig, DesapegoItem, PlannedEntry,
  EfficiencyStats, MonthSummary, EstablishmentRank,
  SpouseProfile, toISODate,
} from "@/lib/types";
import {
  getCurrentMonthTransactions, efficiencyStats, getMonthSummary,
  buildCashFlowProjection, CashFlowPointExtended, topEstablishments, totalMilesFromTransactions,
  sumByCategory,
} from "@/lib/storage";
import * as realPB from "@/lib/pocketbase";
import * as mockPB from "@/lib/mock-pocketbase";
import { useAuth } from "./AuthContext";

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
  addTransactions: (txs: Transaction[]) => Promise<void>;
  updateTransaction: (id: string, patch: Partial<Pick<Transaction, "category" | "amount" | "spouseProfile" | "description" | "treatedName">>) => Promise<void>;
  updateConfig: (partial: Partial<FinancialConfig>) => Promise<void>;
  updateDesapego: (items: DesapegoItem[]) => Promise<void>;
  updateJantares: (count: number) => Promise<void>;
  updateCinemas: (count: number) => Promise<void>;
  addPlannedEntry: (e: PlannedEntry) => Promise<void>;
  updatePlannedEntry: (id: string, patch: Partial<PlannedEntry>) => Promise<void>;
  deletePlannedEntry: (id: string) => Promise<void>;
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

const DEFAULT_CONFIG: FinancialConfig = {
  salarioLiquido: 12000, milhasAtuais: 50000, metaDisney: 600000,
  cotacaoDolar: 5.0, reservaUSD: 1200, metaUSD: 8000,
  cotacaoEuro: 5.65, reservaEUR: 500, metaEUR: 6000,
  cotacaoMediaDCA: 5.42, cotacaoMediaDCAEUR: 5.80,
  maxJantaresMes: 2, maxGastoJantar: 250, aportePercentual: 15,
  iofInternacional: 4.38, limiteSeguranca: 2000,
  maxCinemasMes: 2, maxGastoCinema: 60, customCategories: [],
};

function getEmptyData(): AppData {
  return {
    transactions: [],
    config: { ...DEFAULT_CONFIG },
    desapegoItems: [],
    jantaresUsados: 0,
    cinemasUsados: 0,
    plannedEntries: [],
    updatedAt: toISODate(new Date().toISOString()),
  };
}

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
  const { user, isMockMode } = useAuth();
  const [data, setData] = useState<AppData>(getEmptyData);
  const [configId, setConfigId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("todos");

  // Pick the right API module based on mock mode
  const api = isMockMode ? mockPB : realPB;

  // Load all data
  const loadData = useCallback(async () => {
    if (!user) {
      setData(getEmptyData());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [txs, cfgResult, entries, desapego] = await Promise.all([
        api.fetchAllTransactions(user.id),
        api.fetchConfig(user.id),
        api.fetchPlannedEntries(user.id),
        api.fetchDesapegoItems(user.id),
      ]);
      setConfigId(cfgResult.id);
      setProfileFilter((user as any).defaultProfile as ProfileFilter || "todos");
      setData({
        transactions: txs,
        config: cfgResult.config,
        desapegoItems: desapego,
        jantaresUsados: cfgResult.jantaresUsados,
        cinemasUsados: cfgResult.cinemasUsados ?? 0,
        plannedEntries: entries,
        updatedAt: toISODate(new Date().toISOString()),
      });
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Realtime subscriptions (only for real PB) ──
  useEffect(() => {
    if (!user || isMockMode) return;

    const unsubFns: (() => void)[] = [];
    const pb = realPB.pb;

    pb.collection("transactions").subscribe("*", (e) => {
      setData((prev) => {
        const txs = [...prev.transactions];
        if (e.action === "create") {
          const newTx = realPB.mapTransaction(e.record);
          if (!txs.find((t) => t.id === newTx.id)) {
            txs.push(newTx);
            txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
        } else if (e.action === "update") {
          const idx = txs.findIndex((t) => t.id === e.record.id);
          if (idx >= 0) txs[idx] = realPB.mapTransaction(e.record);
        } else if (e.action === "delete") {
          const idx = txs.findIndex((t) => t.id === e.record.id);
          if (idx >= 0) txs.splice(idx, 1);
        }
        return { ...prev, transactions: txs };
      });
    }).then((unsub) => unsubFns.push(unsub));

    pb.collection("planned_entries").subscribe("*", (e) => {
      setData((prev) => {
        const entries = [...prev.plannedEntries];
        if (e.action === "create") {
          const newE = realPB.mapPlannedEntry(e.record);
          if (!entries.find((x) => x.id === newE.id)) entries.push(newE);
        } else if (e.action === "update") {
          const idx = entries.findIndex((x) => x.id === e.record.id);
          if (idx >= 0) entries[idx] = realPB.mapPlannedEntry(e.record);
        } else if (e.action === "delete") {
          const idx = entries.findIndex((x) => x.id === e.record.id);
          if (idx >= 0) entries.splice(idx, 1);
        }
        return { ...prev, plannedEntries: entries };
      });
    }).then((unsub) => unsubFns.push(unsub));

    pb.collection("financial_config").subscribe("*", (e) => {
      if (e.action === "update") {
        setData((prev) => ({
          ...prev,
          config: realPB.mapFinancialConfig(e.record),
          jantaresUsados: e.record["jantares_usados"] ?? prev.jantaresUsados,
        }));
      }
    }).then((unsub) => unsubFns.push(unsub));

    pb.collection("desapego_items").subscribe("*", () => {
      if (user) {
        realPB.fetchDesapegoItems(user.id).then((items) => {
          setData((prev) => ({ ...prev, desapegoItems: items }));
        });
      }
    }).then((unsub) => unsubFns.push(unsub));

    return () => {
      unsubFns.forEach((fn) => fn());
      pb.collection("transactions").unsubscribe("*").catch(() => {});
      pb.collection("planned_entries").unsubscribe("*").catch(() => {});
      pb.collection("financial_config").unsubscribe("*").catch(() => {});
      pb.collection("desapego_items").unsubscribe("*").catch(() => {});
    };
  }, [user, isMockMode]);

  const finance = computeFinance(data, profileFilter);

  const addTransactions = useCallback(async (txs: Transaction[]) => {
    if (!user) return;
    const created = await api.createTransactions(txs, user.id);
    setData((prev) => ({
      ...prev,
      transactions: [...prev.transactions, ...created].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
  }, [user, api]);

  const updateConfig = useCallback(async (partial: Partial<FinancialConfig>) => {
    if (!configId) return;
    const updated = await api.updateConfigRemote(configId, partial);
    setData((prev) => ({ ...prev, config: updated }));
  }, [configId, api]);

  const updateDesapego = useCallback(async (items: DesapegoItem[]) => {
    if (!user) return;
    await api.saveDesapegoItems(items, user.id);
    setData((prev) => ({ ...prev, desapegoItems: items }));
  }, [user, api]);

  const updateJantares = useCallback(async (count: number) => {
    if (!configId) return;
    await api.updateJantaresRemote(configId, count);
    setData((prev) => ({ ...prev, jantaresUsados: count }));
  }, [configId, api]);

  const updateCinemas = useCallback(async (count: number) => {
    if (!configId) return;
    await api.updateCinemasRemote(configId, count);
    setData((prev) => ({ ...prev, cinemasUsados: count }));
  }, [configId, api]);

  const handleUpdateTransaction = useCallback(async (
    id: string,
    patch: Partial<Pick<Transaction, "category" | "amount" | "spouseProfile" | "description" | "treatedName">>
  ) => {
    const updated = await api.updateTransaction(id, patch);
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === id ? updated : t)),
    }));
  }, [api]);
  const handleAddPlannedEntry = useCallback(async (entry: PlannedEntry) => {
    if (!user) return;
    const created = await api.createPlannedEntry(entry, user.id);
    setData((prev) => ({ ...prev, plannedEntries: [...prev.plannedEntries, created] }));
  }, [user, api]);

  const handleUpdatePlannedEntry = useCallback(async (id: string, patch: Partial<PlannedEntry>) => {
    const updated = await api.updatePlannedEntryRemote(id, patch);
    setData((prev) => ({
      ...prev,
      plannedEntries: prev.plannedEntries.map((e) => (e.id === id ? updated : e)),
    }));
  }, [api]);

  const handleDeletePlannedEntry = useCallback(async (id: string) => {
    await api.deletePlannedEntryRemote(id);
    setData((prev) => ({
      ...prev,
      plannedEntries: prev.plannedEntries.filter((e) => e.id !== id),
    }));
  }, [api]);

  const reload = useCallback(() => {
    loadData();
  }, [loadData]);

  return (
    <FinanceContext.Provider
      value={{
        data, finance, isLoading,
        profileFilter, setProfileFilter,
        addTransactions, updateTransaction: handleUpdateTransaction,
        updateConfig, updateDesapego, updateJantares, updateCinemas,
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
