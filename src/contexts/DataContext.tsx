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
import {
  pb,
  fetchAllTransactions, createTransactions, updateTransaction as updateTxRemote,
  fetchConfig, updateConfigRemote, updateJantaresRemote,
  fetchPlannedEntries, createPlannedEntry as createPERemote,
  updatePlannedEntryRemote, deletePlannedEntryRemote,
  fetchDesapegoItems, saveDesapegoItems,
  mapTransaction, mapPlannedEntry, mapDesapegoItem, mapFinancialConfig,
} from "@/lib/pocketbase";
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
  updateConfig: (partial: Partial<FinancialConfig>) => Promise<void>;
  updateDesapego: (items: DesapegoItem[]) => Promise<void>;
  updateJantares: (count: number) => Promise<void>;
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
};

function getEmptyData(): AppData {
  return {
    transactions: [],
    config: { ...DEFAULT_CONFIG },
    desapegoItems: [],
    jantaresUsados: 0,
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
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(getEmptyData);
  const [configId, setConfigId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("todos");

  // Load all data from PocketBase when user logs in
  const loadFromPB = useCallback(async () => {
    if (!user) {
      setData(getEmptyData());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [txs, cfgResult, entries, desapego] = await Promise.all([
        fetchAllTransactions(user.id),
        fetchConfig(user.id),
        fetchPlannedEntries(user.id),
        fetchDesapegoItems(user.id),
      ]);
      setConfigId(cfgResult.id);
      setProfileFilter(user.defaultProfile as ProfileFilter || "todos");
      setData({
        transactions: txs,
        config: cfgResult.config,
        desapegoItems: desapego,
        jantaresUsados: cfgResult.jantaresUsados,
        plannedEntries: entries,
        updatedAt: toISODate(new Date().toISOString()),
      });
    } catch (err) {
      console.error("Failed to load data from PocketBase:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFromPB();
  }, [loadFromPB]);

  // ── Realtime subscriptions ──
  useEffect(() => {
    if (!user) return;

    const unsubFns: (() => void)[] = [];

    // Transactions realtime
    pb.collection("transactions").subscribe("*", (e) => {
      setData((prev) => {
        const txs = [...prev.transactions];
        if (e.action === "create") {
          const newTx = mapTransaction(e.record);
          if (!txs.find((t) => t.id === newTx.id)) {
            txs.push(newTx);
            txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
        } else if (e.action === "update") {
          const idx = txs.findIndex((t) => t.id === e.record.id);
          if (idx >= 0) txs[idx] = mapTransaction(e.record);
        } else if (e.action === "delete") {
          const idx = txs.findIndex((t) => t.id === e.record.id);
          if (idx >= 0) txs.splice(idx, 1);
        }
        return { ...prev, transactions: txs };
      });
    }).then((unsub) => unsubFns.push(unsub));

    // Planned entries realtime
    pb.collection("planned_entries").subscribe("*", (e) => {
      setData((prev) => {
        const entries = [...prev.plannedEntries];
        if (e.action === "create") {
          const newE = mapPlannedEntry(e.record);
          if (!entries.find((x) => x.id === newE.id)) entries.push(newE);
        } else if (e.action === "update") {
          const idx = entries.findIndex((x) => x.id === e.record.id);
          if (idx >= 0) entries[idx] = mapPlannedEntry(e.record);
        } else if (e.action === "delete") {
          const idx = entries.findIndex((x) => x.id === e.record.id);
          if (idx >= 0) entries.splice(idx, 1);
        }
        return { ...prev, plannedEntries: entries };
      });
    }).then((unsub) => unsubFns.push(unsub));

    // Financial config realtime
    pb.collection("financial_config").subscribe("*", (e) => {
      if (e.action === "update") {
        setData((prev) => ({
          ...prev,
          config: mapFinancialConfig(e.record),
          jantaresUsados: e.record["jantares_usados"] ?? prev.jantaresUsados,
        }));
      }
    }).then((unsub) => unsubFns.push(unsub));

    // Desapego items realtime
    pb.collection("desapego_items").subscribe("*", () => {
      // Simple: reload all desapego items on any change
      if (user) {
        fetchDesapegoItems(user.id).then((items) => {
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
  }, [user]);

  const finance = computeFinance(data, profileFilter);

  const addTransactions = useCallback(async (txs: Transaction[]) => {
    if (!user) return;
    const created = await createTransactions(txs, user.id);
    setData((prev) => ({
      ...prev,
      transactions: [...prev.transactions, ...created].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
  }, [user]);

  const updateConfig = useCallback(async (partial: Partial<FinancialConfig>) => {
    if (!configId) return;
    const updated = await updateConfigRemote(configId, partial);
    setData((prev) => ({ ...prev, config: updated }));
  }, [configId]);

  const updateDesapego = useCallback(async (items: DesapegoItem[]) => {
    if (!user) return;
    await saveDesapegoItems(items, user.id);
    setData((prev) => ({ ...prev, desapegoItems: items }));
  }, [user]);

  const updateJantares = useCallback(async (count: number) => {
    if (!configId) return;
    await updateJantaresRemote(configId, count);
    setData((prev) => ({ ...prev, jantaresUsados: count }));
  }, [configId]);

  const handleAddPlannedEntry = useCallback(async (entry: PlannedEntry) => {
    if (!user) return;
    const created = await createPERemote(entry, user.id);
    setData((prev) => ({ ...prev, plannedEntries: [...prev.plannedEntries, created] }));
  }, [user]);

  const handleUpdatePlannedEntry = useCallback(async (id: string, patch: Partial<PlannedEntry>) => {
    const updated = await updatePlannedEntryRemote(id, patch);
    setData((prev) => ({
      ...prev,
      plannedEntries: prev.plannedEntries.map((e) => (e.id === id ? updated : e)),
    }));
  }, []);

  const handleDeletePlannedEntry = useCallback(async (id: string) => {
    await deletePlannedEntryRemote(id);
    setData((prev) => ({
      ...prev,
      plannedEntries: prev.plannedEntries.filter((e) => e.id !== id),
    }));
  }, []);

  const reload = useCallback(() => {
    loadFromPB();
  }, [loadFromPB]);

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
