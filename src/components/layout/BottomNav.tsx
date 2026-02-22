import { useLocation, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, PieChart, Plus, CalendarClock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: PieChart, label: "Gastos", path: "/expenses" },
  null, // placeholder for FAB
  { icon: CalendarClock, label: "Lançam.", path: "/planned" },
  { icon: Settings, label: "Config", path: "/settings" },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl lg:hidden">
      <div className="relative flex items-center justify-around py-2">
        {navItems.map((item, idx) => {
          if (!item) {
            // Center FAB slot — rendered separately below
            return <div key="fab-slot" className="w-14" />;
          }
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                )}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Floating Action Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.08 }}
          onClick={() => navigate("/upload")}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)] ring-4 ring-card"
          aria-label="Lançamento Rápido"
        >
          <Plus className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
        </motion.button>
      </div>
    </nav>
  );
};
