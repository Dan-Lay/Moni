import { Sparkles, Users, User } from "lucide-react";
import { SaldoCard } from "@/components/dashboard/SaldoCard";
import { DisneyThermometer } from "@/components/dashboard/DisneyThermometer";
import { MiguelThermometer } from "@/components/dashboard/MiguelThermometer";
import { LiberdadeFinanceira } from "@/components/dashboard/LiberdadeFinanceira";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { DollarDisney } from "@/components/dashboard/DollarDisney";
import { EfficiencyIndex } from "@/components/dashboard/EfficiencyIndex";
import { TopEstablishments } from "@/components/dashboard/TopEstablishments";
import { MonthlyComparisonChart } from "@/components/dashboard/MonthlyComparisonChart";
import { AppLayout } from "@/components/layout/AppLayout";
import { useFinance, ProfileFilter } from "@/contexts/DataContext";
import { motion } from "framer-motion";

const PROFILE_OPTIONS: { value: ProfileFilter; label: string; icon?: React.ReactNode }[] = [
  { value: "todos", label: "Geral", icon: <Users className="h-3 w-3" /> },
  { value: "marido", label: "Marido", icon: <User className="h-3 w-3" /> },
  { value: "esposa", label: "Esposa", icon: <User className="h-3 w-3" /> },
];

const Index = () => {
  const { profileFilter, setProfileFilter } = useFinance();

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
      </header>

      <div className="space-y-4 w-full min-w-0 overflow-x-hidden">
        {/* Row 1: CashFlow full width */}
        <div className="w-full" style={{ minHeight: 280 }}>
          <CashFlowChart />
        </div>

        {/* Row 2: Monthly Comparison full width */}
        <div className="w-full" style={{ minHeight: 240 }}>
          <MonthlyComparisonChart />
        </div>

        {/* Row 3: LiberdadeFinanceira | SaldoCard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LiberdadeFinanceira />
          <SaldoCard />
        </div>

        {/* Row 4: ExpensePieChart | TopEstablishments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExpensePieChart />
          <TopEstablishments />
        </div>

        {/* Row 5: Footer — 4 small cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiguelThermometer />
          <DollarDisney />
          <EfficiencyIndex />
          <DisneyThermometer />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
