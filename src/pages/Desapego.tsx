import { AppLayout } from "@/components/layout/AppLayout";
import { Package, Check, DollarSign, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAppData } from "@/contexts/DataContext";

const Desapego = () => {
  const { data, updateDesapego } = useAppData();
  const items = data.desapegoItems;
  const totalVendido = items.filter((i) => i.sold).reduce((acc, i) => acc + i.value, 0);

  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");

  const toggleSold = (id: number) => {
    updateDesapego(items.map((item) => (item.id === id ? { ...item, sold: !item.sold } : item)));
  };

  const addItem = () => {
    if (!newName.trim() || !newValue.trim()) return;
    const newItem = {
      id: Date.now(),
      name: newName.trim(),
      value: parseFloat(newValue) || 0,
      sold: false,
    };
    updateDesapego([...items, newItem]);
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
          <p className="font-mono text-xl font-bold text-primary">
            R$ {totalVendido.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Add new item */}
      <div className="mb-4 glass-card rounded-xl p-4 flex gap-2 flex-wrap">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do item"
          className="flex-1 min-w-[140px] rounded-lg bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Valor (R$)"
          type="number"
          className="w-28 rounded-lg bg-secondary px-3 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={addItem}
          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`glass-card flex items-center justify-between rounded-xl p-4 transition-all ${
              item.sold ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className={`text-sm font-medium ${item.sold ? "line-through" : ""}`}>
                  {item.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  R$ {item.value.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleSold(item.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                item.sold
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground hover:bg-accent/20 hover:text-accent"
              }`}
            >
              {item.sold ? (
                <><Check className="h-3 w-3" /> Vendido</>
              ) : (
                "Disponível"
              )}
            </button>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Desapego;
