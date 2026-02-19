import { useState, useCallback, useEffect, useRef } from "react";
import {
  ResponsiveGridLayout, useContainerWidth,
  type LayoutItem, type Layout, type ResponsiveLayouts,
  verticalCompactor,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Sparkles, Users, User, RotateCcw, LayoutGrid } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  DEFAULT_LAYOUT, IDEAL_LAYOUT, loadLayoutFromStorage, saveLayoutToStorage,
  clearLayoutStorage, loadLayoutFromPB, saveLayoutToPB, resetLayoutInPB,
} from "@/lib/dashboard-layout";
import { useIsMobile } from "@/hooks/use-mobile";

interface CardDef {
  id: string;
  component: React.FC;
}

const ALL_CARDS: CardDef[] = [
  { id: "cashflow", component: CashFlowChart },
  { id: "saldo", component: SaldoCard },
  { id: "disney", component: DisneyThermometer },
  { id: "miguel", component: MiguelThermometer },
  { id: "liberdade", component: LiberdadeFinanceira },
  { id: "entretenimento", component: DinnerCounter },
  { id: "eficiencia", component: EfficiencyIndex },
  { id: "dolar", component: DollarDisney },
  { id: "pie", component: ExpensePieChart },
  { id: "top", component: TopEstablishments },
];

const PROFILE_OPTIONS: { value: ProfileFilter; label: string; icon?: React.ReactNode }[] = [
  { value: "todos", label: "Geral", icon: <Users className="h-3 w-3" /> },
  { value: "marido", label: "Marido", icon: <User className="h-3 w-3" /> },
  { value: "esposa", label: "Esposa", icon: <User className="h-3 w-3" /> },
];

// Mobile layout: single column stacked with appropriate heights
const MOBILE_HEIGHTS: Record<string, number> = {
  cashflow: 8, saldo: 6, disney: 5, miguel: 5,
  liberdade: 9, entretenimento: 7, eficiencia: 6,
  dolar: 6, pie: 7, top: 7,
};

const MOBILE_LAYOUT: LayoutItem[] = (() => {
  let y = 0;
  return DEFAULT_LAYOUT.map((item) => {
    const h = MOBILE_HEIGHTS[item.i] ?? 5;
    const entry = { ...item, x: 0, w: 12, y, h, minW: 12, minH: 3 };
    y += h;
    return entry;
  });
})();

const ROW_HEIGHT = 40;
const DEBOUNCE_MS = 1500;

const Index = () => {
  const { profileFilter, setProfileFilter } = useFinance();
  const { user, isMockMode } = useAuth();
  const isMobile = useIsMobile();
  const { width, containerRef } = useContainerWidth();

  const [currentLayout, setCurrentLayout] = useState<LayoutItem[]>([...DEFAULT_LAYOUT]);
  const [loaded, setLoaded] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load layout on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let saved: LayoutItem[] | null = null;

      if (isMockMode) {
        saved = loadLayoutFromStorage();
      } else if (user?.id) {
        saved = await loadLayoutFromPB(user.id);
      }

      if (!cancelled) {
        setCurrentLayout(saved ?? [...DEFAULT_LAYOUT]);
        setLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, isMockMode]);

  // Debounced save
  const persistLayout = useCallback((newLayout: LayoutItem[]) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (isMockMode) {
        saveLayoutToStorage(newLayout);
      } else if (user?.id) {
        saveLayoutToPB(user.id, newLayout);
      }
    }, DEBOUNCE_MS);
  }, [isMockMode, user?.id]);

  const handleLayoutChange = useCallback((layout: Layout) => {
    // Layout is readonly LayoutItem[], we need mutable copy
    const mutable = layout.map((item) => ({ ...item }));
    setCurrentLayout(mutable);
    persistLayout(mutable);
  }, [persistLayout]);

  const handleResetLayout = useCallback(() => {
    setCurrentLayout([...DEFAULT_LAYOUT]);
    if (isMockMode) {
      clearLayoutStorage();
    } else if (user?.id) {
      resetLayoutInPB(user.id);
    }
  }, [isMockMode, user?.id]);

  const handleOrganizeLayout = useCallback(() => {
    const organized = [...IDEAL_LAYOUT];
    setCurrentLayout(organized);
    persistLayout(organized);
  }, [persistLayout]);

  const responsiveLayouts: ResponsiveLayouts = {
    lg: currentLayout,
    md: currentLayout,
    sm: MOBILE_LAYOUT,
    xs: MOBILE_LAYOUT,
  };

  if (!loaded) return null;

  return (
    <AppLayout>
      <header className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 lg:hidden">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary hidden lg:block" />
            <h1 className="text-base sm:text-lg font-bold tracking-tight">Moni</h1>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {!isMobile && (
            <>
              <button
                onClick={handleOrganizeLayout}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                title="Organizar layout automaticamente"
              >
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">Organizar</span>
              </button>
              <button
                onClick={handleResetLayout}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                title="Resetar layout do dashboard"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </>
          )}
          <div className="flex items-center gap-0.5 rounded-xl bg-secondary p-0.5 sm:p-1">
            {PROFILE_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                onClick={() => setProfileFilter(opt.value)}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-0.5 sm:gap-1 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold transition-all ${
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
        </div>
      </header>

      <div ref={containerRef} className="w-full">
        {width > 0 && (
          <ResponsiveGridLayout
            className="dashboard-grid"
            width={width}
            layouts={responsiveLayouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 0 }}
            cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
            rowHeight={ROW_HEIGHT}
            onLayoutChange={handleLayoutChange}
            compactor={verticalCompactor}
            margin={isMobile ? [8, 8] : [16, 16]}
            containerPadding={[0, 0]}
            dragConfig={{
              handle: ".drag-handle",
              enabled: !isMobile,
            }}
            resizeConfig={{
              enabled: !isMobile,
              handles: ["se", "e", "s"],
            }}
          >
          {ALL_CARDS.map((card) => {
            const CardComponent = card.component;
            return (
              <div key={card.id} className="group">
                <div className="drag-handle absolute top-1 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                  <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="card-inner">
                  <CardComponent />
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
