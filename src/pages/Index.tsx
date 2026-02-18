import { Swords } from "lucide-react";
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

const Index = () => {
  return (
    <AppLayout>
      <header className="mb-6 flex items-center gap-3 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Swords className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">FinWar</h1>
          <p className="text-[11px] text-muted-foreground">Dashboard de Guerra</p>
        </div>
      </header>

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
