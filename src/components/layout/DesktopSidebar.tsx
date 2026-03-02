import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, PieChart, Upload, ShoppingBag, Settings, Sparkles, ListOrdered, CalendarClock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: PieChart, label: "Gastos", path: "/expenses" },
  { icon: ListOrdered, label: "Extrato", path: "/transactions" },
  { icon: CalendarClock, label: "Orçamento", path: "/planned" },
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
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Moni</h1>
          <p className="text-xs text-muted-foreground">Sua inteligência financeira</p>
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
        <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-3">
          <Target className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-semibold text-primary">Suas Metas</p>
            <p className="text-[10px] text-muted-foreground">A Moni cuida de tudo 💜</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
