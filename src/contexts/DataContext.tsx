import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from "react";
import {
  AppData, Transaction, FinancialConfig, DesapegoItem, PlannedEntry,
  EfficiencyStats, MonthSummary, EstablishmentRank,
  SpouseProfile, toISODate, CATEGORY_LABELS,
} from "@/lib/types";
import {
  getCurrentMonthTransactions, efficiencyStats, getMonthSummary,
  buildCashFlowProjection, CashFlowPointExtended, topEstablishments, totalMilesFromTransactions,
  sumByCategory,
} from "@/lib/storage";
import * as realPB from "@/lib/pocketbase";
import * as mockPB from "@/lib/mock-pocketbase";
import { supabase } from "@/lib/supabase";
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
  updateTransaction: (id: string, patch: Partial<Pick<Transaction, "category" | "amount" | "spouseProfile" | "description" | "treatedName" | "cardNetwork" | "isConfirmed">>) => Promise<void>;
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

export const useAppData = useFinance;

const DEFAULT_CONFIG: FinancialConfig = {
  salarioLiquido: 12000, milhasAtuais: 50000, metaDisney: 600000,
  cotacaoDolar: 5.0, reservaUSD: 1200, metaUSD: 8000,
  cotacaoEuro: 5.65, reservaEUR: 500, metaEUR: 6000,
  cotacaoMediaDCA: 5.42, cotacaoMediaDCAEUR: 5.80,
  maxJantaresMes: 2, maxGastoJantar: 250, aportePercentual: 15,
  iofInternacional: 4.38, limiteSeguranca: 2000,
  maxCinemasMes: 2, maxGastoCinema: 60, customCategories: [],
  milhasConversaoMastercardBRL: 1.0, milhasConversaoMastercardUSD: 2.0,
  milhasConversaoVisaBRL: 0.0, milhasConversaoVisaUSD: 0.0,
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
    totalMilesEarned: totalMilesFromTransactions(data.transactions, data.config),
    categoryBreakdown: sumByCategory(monthTxs, profile),
  };
}

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const { user, isMockMode } = useAuth();
  const [data, setData] = useState<AppData>(getEmptyData);
  const [configId, setConfigId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("todos");

  const api = isMockMode ? mockPB : realPB;

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

  // ── Supabase Realtime subscriptions ──
  const insertBufferRef = useRef<Transaction[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || isMockMode) return;

    const flushInserts = () => {
      const buffered = insertBufferRef.current;
      if (buffered.length === 0) return;
      insertBufferRef.current = [];
      setData((prev) => {
        const existingIds = new Set(prev.transactions.map((t) => t.id));
        const newOnes = buffered.filter((t) => !existingIds.has(t.id));
        if (newOnes.length === 0) return prev;
        const merged = [...prev.transactions, ...newOnes];
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { ...prev, transactions: merged };
      });
    };

    const channel = supabase
      .channel(`moni-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          // Buffer batch inserts and flush after 300ms of silence
          insertBufferRef.current.push(realPB.mapTransaction(payload.new));
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          flushTimerRef.current = setTimeout(flushInserts, 300);
        } else if (payload.eventType === "UPDATE") {
          setData((prev) => {
            const txs = [...prev.transactions];
            const idx = txs.findIndex((t) => t.id === payload.new.id);
            if (idx >= 0) txs[idx] = realPB.mapTransaction(payload.new);
            return { ...prev, transactions: txs };
          });
        } else if (payload.eventType === "DELETE") {
          setData((prev) => ({
            ...prev,
            transactions: prev.transactions.filter((t) => t.id !== payload.old.id),
          }));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "planned_entries", filter: `user_id=eq.${user.id}` }, (payload) => {
        setData((prev) => {
          const entries = [...prev.plannedEntries];
          if (payload.eventType === "INSERT") {
            const newE = realPB.mapPlannedEntry(payload.new);
            if (!entries.find((x) => x.id === newE.id)) entries.push(newE);
          } else if (payload.eventType === "UPDATE") {
            const idx = entries.findIndex((x) => x.id === payload.new.id);
            if (idx >= 0) entries[idx] = realPB.mapPlannedEntry(payload.new);
          } else if (payload.eventType === "DELETE") {
            const idx = entries.findIndex((x) => x.id === payload.old.id);
            if (idx >= 0) entries.splice(idx, 1);
          }
          return { ...prev, plannedEntries: entries };
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "financial_config", filter: `user_id=eq.${user.id}` }, (payload) => {
        setData((prev) => ({
          ...prev,
          config: realPB.mapFinancialConfig(payload.new),
          jantaresUsados: payload.new.jantares_usados ?? prev.jantaresUsados,
          cinemasUsados: payload.new.cinemas_usados ?? prev.cinemasUsados,
        }));
      })
      .subscribe();

    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      insertBufferRef.current = [];
      supabase.removeChannel(channel);
    };
  }, [user, isMockMode]);

  const finance = useMemo(
    () => computeFinance(data, profileFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.transactions, data.config, data.plannedEntries, profileFilter]
  );

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
    const hasCategoryPatch =
      "customCategories" in partial ||
      "hiddenBuiltInCategories" in partial ||
      "renamedBuiltInCategories" in partial;
    const mergedPartial = hasCategoryPatch
      ? {
          ...partial,
          customCategories: partial.customCategories ?? data.config.customCategories,
          hiddenBuiltInCategories:
            partial.hiddenBuiltInCategories ?? data.config.hiddenBuiltInCategories ?? [],
          renamedBuiltInCategories:
            partial.renamedBuiltInCategories ?? data.config.renamedBuiltInCategories ?? {},
        }
      : partial;
    const updated = await api.updateConfigRemote(configId, mergedPartial);
    setData((prev) => ({ ...prev, config: updated }));
  }, [configId, api, data.config]);

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
    patch: Partial<Pick<Transaction, "category" | "amount" | "spouseProfile" | "description" | "treatedName" | "cardNetwork" | "isConfirmed">>
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

export const DataProvider = FinanceProvider;

export const useCategoryLabels = (): Record<string, string> => {
  const { data } = useFinance();
  return useMemo(() => {
    const customCategories = data.config.customCategories ?? [];
    const hiddenBuiltIn = (data.config.hiddenBuiltInCategories as string[] | undefined) ?? [];
    const renamedBuiltIn = (data.config.renamedBuiltInCategories as Record<string, string> | undefined) ?? {};
    const labels: Record<string, string> = {};
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      if (!hiddenBuiltIn.includes(key)) {
        labels[key] = renamedBuiltIn[key] ?? label;
      }
    }
    for (const cat of customCategories) {
      labels[cat.key] = cat.label;
    }
    return labels;
  }, [data.config]);
};
