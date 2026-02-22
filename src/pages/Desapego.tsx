import { AppLayout } from "@/components/layout/AppLayout";
import { Package, Check, DollarSign, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useFinance } from "@/contexts/DataContext";

const Desapego = () => {
  const { data, updateDesapego } = useFinance();
  const items = data.desapegoItems;
  const totalVendido = items.filter((i) => i.sold).reduce((acc, i) => acc + i.value, 0);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");

  const formatCurrency = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (formatted: string): number => {
    const digits = formatted.replace(/\D/g, "");
    return parseInt(digits || "0", 10) / 100;
  };

  const toggleSold = (id: number) => {
    updateDesapego(items.map((item) => (item.id === id ? { ...item, sold: !item.sold } : item)));
  };

  const addItem = () => {
    if (!newName.trim() || !newValue.trim()) return;
    updateDesapego([...items, { id: Date.now(), name: newName.trim(), value: parseCurrency(newValue), sold: false }]);
    setNewName("");
    setNewValue("");
  };

  return (
    <AppLayout>
      <h1 className="mb-2 text-xl font-bold">Painel de Desapego</h1>
      <p className="mb-6 text-sm text-muted-foreground">Venda itens e some ao aporte mensal</p>
      <div className="mb-6 glass-card rounded-2xl p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total vendido → Aporte</p>
          <p className="font-mono text-xl font-bold text-primary">R$ {totalVendido.toLocaleString("pt-BR")}</p>
        </div>
      </div>
      <div className="mb-4 glass-card rounded-xl p-4 flex gap-2 flex-wrap">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do item"
          className="flex-1 min-w-[140px] rounded-lg bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground" />
        <div className="relative w-32">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">R$</span>
          <input value={newValue} onChange={(e) => setNewValue(formatCurrency(e.target.value))} placeholder="0,00"
            inputMode="numeric"
            className="w-full rounded-lg bg-secondary pl-9 pr-3 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        </div>
        <button onClick={addItem} className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className={`glass-card flex items-center justify-between rounded-xl p-4 transition-all ${item.sold ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className={`text-sm font-medium ${item.sold ? "line-through" : ""}`}>{item.name}</p>
                <p className="font-mono text-xs text-muted-foreground">R$ {item.value.toLocaleString("pt-BR")}</p>
              </div>
            </div>
            <button onClick={() => toggleSold(item.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${item.sold ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground hover:bg-accent/20 hover:text-accent"}`}>
              {item.sold ? <><Check className="h-3 w-3" /> Vendido</> : "Disponível"}
            </button>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Desapego;
