import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Sparkles, Users, User, GripVertical } from "lucide-react";
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

interface CardDef {
  id: string;
  component: React.FC;
  span: "full" | "third" | "half";
}

const ALL_CARDS: CardDef[] = [
  { id: "cashflow", component: CashFlowChart, span: "full" },
  { id: "saldo", component: SaldoCard, span: "third" },
  { id: "disney", component: DisneyThermometer, span: "third" },
  { id: "miguel", component: MiguelThermometer, span: "third" },
  { id: "liberdade", component: LiberdadeFinanceira, span: "third" },
  { id: "entretenimento", component: DinnerCounter, span: "third" },
  { id: "eficiencia", component: EfficiencyIndex, span: "third" },
  { id: "dolar", component: DollarDisney, span: "third" },
  { id: "pie", component: ExpensePieChart, span: "half" },
  { id: "top", component: TopEstablishments, span: "full" },
];

const SPAN_CLASSES: Record<string, string> = {
  full: "col-span-1 lg:col-span-3 xl:col-span-3",
  half: "col-span-1 lg:col-span-2 xl:col-span-2",
  third: "col-span-1",
};

function loadOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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
                return (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${SPAN_CLASSES[card.span]} ${snapshot.isDragging ? "z-50 opacity-90" : ""}`}
                      >
                        <div className="relative group">
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing rounded-lg bg-secondary/80 p-1"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
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
