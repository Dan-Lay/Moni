import { AppLayout } from "@/components/layout/AppLayout";
import { Package, Check, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface Item {
  id: number;
  name: string;
  value: number;
  sold: boolean;
}

const initialItems: Item[] = [
  { id: 1, name: "Carrinho de bebê Chicco", value: 450, sold: false },
  { id: 2, name: "Monitor Samsung 24\"", value: 600, sold: true },
  { id: 3, name: "Cadeirinha carro", value: 350, sold: false },
  { id: 4, name: "Bicicleta ergométrica", value: 800, sold: true },
  { id: 5, name: "iPhone 12 (usado)", value: 1200, sold: false },
];

const Desapego = () => {
  const [items, setItems] = useState(initialItems);
  const totalVendido = items.filter((i) => i.sold).reduce((acc, i) => acc + i.value, 0);

  const toggleSold = (id: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, sold: !item.sold } : item)));
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

      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
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
                <>
                  <Check className="h-3 w-3" /> Vendido
                </>
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
