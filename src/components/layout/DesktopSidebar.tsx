import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, PieChart, Upload, ShoppingBag, Settings, Plane, Swords, ListOrdered, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: PieChart, label: "Gastos", path: "/expenses" },
  { icon: ListOrdered, label: "Transações", path: "/transactions" },
  { icon: CalendarClock, label: "Contas a Pagar", path: "/planned" },
  { icon: Upload, label: "Upload", path: "/upload" },
  { icon: ShoppingBag, label: "Desapego", path: "/desapego" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

export const DesktopSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Swords className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">FinWar</h1>
          <p className="text-xs text-muted-foreground">Gestão de Guerra</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary glow-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-accent/10 px-3 py-3">
          <Plane className="h-5 w-5 text-accent" />
          <div>
            <p className="text-xs font-semibold text-accent">Disney 2028</p>
            <p className="text-[10px] text-muted-foreground">A missão continua!</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
