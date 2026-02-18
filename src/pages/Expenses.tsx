import { AppLayout } from "@/components/layout/AppLayout";
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart";
import { TopEstablishments } from "@/components/dashboard/TopEstablishments";

const Expenses = () => {
  return (
    <AppLayout>
      <h1 className="mb-6 text-xl font-bold">Gastos do Mês</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <ExpensePieChart />
        <TopEstablishments />
      </div>
    </AppLayout>
  );
};

export default Expenses;
