import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, PieChart, Upload, ShoppingBag, Settings, ListOrdered, CalendarClock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: PieChart, label: "Gastos", path: "/expenses" },
  { icon: ListOrdered, label: "Extrato", path: "/transactions" },
  { icon: CalendarClock, label: "Orcamento", path: "/planned" },
  { icon: Upload, label: "Upload", path: "/upload" },
  { icon: ShoppingBag, label: "Desapego", path: "/desapego" },
  { icon: Settings, label: "Configuracoes", path: "/settings" },
];

export const DesktopSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 bg-white lg:flex lg:flex-col" style={{ boxShadow: '1px 0 0 hsl(220 14% 92%)' }}>
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary">
          <span className="text-sm font-bold text-primary-foreground">M</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Moni</h1>
          <p className="text-[11px] text-muted-foreground font-medium">Sua inteligencia financeira</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: 'hsl(40 40% 96%)' }}>
          <Target className="h-5 w-5" style={{ color: 'hsl(40 40% 55%)' }} />
          <div>
            <p className="text-xs font-semibold text-foreground">Suas Metas</p>
            <p className="text-[10px] text-muted-foreground">A Moni cuida de tudo</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
