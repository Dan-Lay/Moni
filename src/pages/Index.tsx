import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Sparkles, Users, User, GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { SaldoCard } from "@/components/dashboard/SaldoCard";
import { DisneyThermometer } from "@/components/dashboard/DisneyThermometer";
import { MiguelThermometer } from "@/components/dashboard/MiguelThermometer";
import { LiberdadeFinanceira } from "@/components/dashboard/LiberdadeFinanceira";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { DinnerCounter } from "@/components/dashboard/DinnerCounter";
import { DollarDisney } from "@/components/dashboard/DollarDisney";
import { EfficiencyIndex } from "@/components/dashboard/EfficiencyIndex";
import { TopEstablishments } from "@/components/dashboard/TopEstablishments";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinance, ProfileFilter } from "@/contexts/DataContext";
import { motion } from "framer-motion";

const STORAGE_KEY = "moni_dashboard_order";
const SIZE_STORAGE_KEY = "moni_dashboard_sizes";

type CardSize = "third" | "half" | "full";

interface CardDef {
  id: string;
  component: React.FC;
  defaultSpan: CardSize;
  allowResize?: boolean; // false = locked to defaultSpan
}

const ALL_CARDS: CardDef[] = [
  { id: "cashflow", component: CashFlowChart, defaultSpan: "full", allowResize: false },
  { id: "saldo", component: SaldoCard, defaultSpan: "third" },
  { id: "disney", component: DisneyThermometer, defaultSpan: "third" },
  { id: "miguel", component: MiguelThermometer, defaultSpan: "third" },
  { id: "liberdade", component: LiberdadeFinanceira, defaultSpan: "third" },
  { id: "entretenimento", component: DinnerCounter, defaultSpan: "third" },
  { id: "eficiencia", component: EfficiencyIndex, defaultSpan: "third" },
  { id: "dolar", component: DollarDisney, defaultSpan: "third" },
  { id: "pie", component: ExpensePieChart, defaultSpan: "half" },
  { id: "top", component: TopEstablishments, defaultSpan: "full" },
];

const SPAN_CLASSES: Record<CardSize, string> = {
  full: "col-span-1 lg:col-span-3 xl:col-span-3",
  half: "col-span-1 lg:col-span-2 xl:col-span-2",
  third: "col-span-1",
};

// Size cycle: third -> half -> full -> third
const NEXT_SIZE: Record<CardSize, CardSize> = {
  third: "half",
  half: "full",
  full: "third",
};

function loadOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadSizes(): Record<string, CardSize> {
  try {
    const raw = localStorage.getItem(SIZE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const PROFILE_OPTIONS: { value: ProfileFilter; label: string; icon?: React.ReactNode }[] = [
  { value: "todos", label: "Geral", icon: <Users className="h-3 w-3" /> },
  { value: "marido", label: "Marido", icon: <User className="h-3 w-3" /> },
  { value: "esposa", label: "Esposa", icon: <User className="h-3 w-3" /> },
];

const Index = () => {
  const { profileFilter, setProfileFilter } = useFinance();

  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    const saved = loadOrder();
    return saved && saved.length === ALL_CARDS.length ? saved : ALL_CARDS.map((c) => c.id);
  });

  const [cardSizes, setCardSizes] = useState<Record<string, CardSize>>(loadSizes);

  const getCardSize = useCallback(
    (card: CardDef): CardSize => {
      if (card.allowResize === false) return card.defaultSpan;
      return cardSizes[card.id] ?? card.defaultSpan;
    },
    [cardSizes]
  );

  const toggleSize = useCallback((cardId: string) => {
    setCardSizes((prev) => {
      const card = ALL_CARDS.find((c) => c.id === cardId);
      if (!card || card.allowResize === false) return prev;
      const currentSize = prev[cardId] ?? card.defaultSpan;
      const next = NEXT_SIZE[currentSize];
      const updated = { ...prev, [cardId]: next };
      localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const orderedCards = useMemo(
    () => cardOrder.map((id) => ALL_CARDS.find((c) => c.id === id)!).filter(Boolean),
    [cardOrder]
  );

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const newOrder = [...cardOrder];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setCardOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  }, [cardOrder]);

  return (
    <AppLayout>
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 lg:hidden">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary hidden lg:block" />
            <h1 className="text-lg font-bold tracking-tight">Moni</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          {PROFILE_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => setProfileFilter(opt.value)}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                profileFilter === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.icon}
              {opt.label}
            </motion.button>
          ))}
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid gap-4 grid-cols-1 lg:grid-cols-3"
            >
              {orderedCards.map((card, index) => {
                const CardComponent = card.component;
                const size = getCardSize(card);
                const canResize = card.allowResize !== false;
                return (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${SPAN_CLASSES[size]} transition-all duration-300 ${snapshot.isDragging ? "z-50 opacity-90" : ""}`}
                      >
                        <div className="relative group">
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canResize && (
                              <button
                                onClick={() => toggleSize(card.id)}
                                className="rounded-lg bg-secondary/80 p-1 hover:bg-secondary cursor-pointer"
                                title={`Tamanho: ${size === "third" ? "1/3" : size === "half" ? "1/2" : "Total"} — Clique para alterar`}
                              >
                                {size === "full" ? (
                                  <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing rounded-lg bg-secondary/80 p-1 hover:bg-secondary"
                            >
                              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </div>
                          <CardComponent />
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </AppLayout>
  );
};

export default Index;
