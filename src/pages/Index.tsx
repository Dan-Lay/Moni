import { Swords, Users, User } from "lucide-react";
import { SaldoCard } from "@/components/dashboard/SaldoCard";
import { DisneyThermometer } from "@/components/dashboard/DisneyThermometer";
import { AporteKPI } from "@/components/dashboard/AporteKPI";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { DinnerCounter } from "@/components/dashboard/DinnerCounter";
import { DollarDisney } from "@/components/dashboard/DollarDisney";
import { EfficiencyIndex } from "@/components/dashboard/EfficiencyIndex";
import { TopEstablishments } from "@/components/dashboard/TopEstablishments";
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
      <header className="mb-6 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Swords className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">FinWar</h1>
            <p className="text-[11px] text-muted-foreground">Dashboard de Guerra</p>
          </div>
        </div>

        {/* Profile filter toggle */}
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

      {/* Desktop profile toggle */}
      <div className="mb-4 hidden items-center justify-between lg:flex">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">FinWar</h1>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          {PROFILE_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => setProfileFilter(opt.value)}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
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

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <SaldoCard />
        <DisneyThermometer />
        <AporteKPI />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <DinnerCounter />
        <EfficiencyIndex />
        <DollarDisney />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CashFlowChart />
        <ExpensePieChart />
      </div>

      <div className="mt-4">
        <TopEstablishments />
      </div>
    </AppLayout>
  );
};

export default Index;
