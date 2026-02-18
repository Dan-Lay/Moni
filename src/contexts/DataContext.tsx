import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { AppData, Transaction, FinancialConfig, DesapegoItem } from "@/lib/types";
import {
  loadAppData,
  saveAppData,
  addTransactions as addTxs,
  updateConfig as updCfg,
  updateDesapego as updDesapego,
  updateJantares as updJantares,
} from "@/lib/storage";

interface DataContextType {
  data: AppData;
  addTransactions: (txs: Transaction[]) => void;
  updateConfig: (partial: Partial<FinancialConfig>) => void;
  updateDesapego: (items: DesapegoItem[]) => void;
  updateJantares: (count: number) => void;
  reload: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const useAppData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useAppData must be used within DataProvider");
  return ctx;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AppData>(loadAppData);

  const reload = useCallback(() => setData(loadAppData()), []);

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

  return (
    <DataContext.Provider value={{ data, addTransactions, updateConfig, updateDesapego, updateJantares, reload }}>
      {children}
    </DataContext.Provider>
  );
};
