import { useLocation, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, PieChart, Plus, CalendarClock, Settings, ListOrdered, Upload, ShoppingBag, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const primaryNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: PieChart, label: "Gastos", path: "/expenses" },
  null, // FAB slot
  { icon: CalendarClock, label: "Lançam.", path: "/planned" },
  { icon: Menu, label: "Mais", path: "__more__" },
];

const moreItems = [
  { icon: ListOrdered, label: "Extrato", path: "/transactions" },
  { icon: Upload, label: "Upload", path: "/upload" },
  { icon: ShoppingBag, label: "Desapego", path: "/desapego" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreItems.some((i) => location.pathname === i.path);

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
            onClick={() => setShowMore(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-20 left-4 right-4 rounded-2xl border border-border bg-card p-3 shadow-xl"
            >
              <div className="grid grid-cols-2 gap-2">
                {moreItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMore(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl lg:hidden">
        <div className="relative flex items-center justify-around py-2">
          {primaryNav.map((item, idx) => {
            if (!item) {
              return <div key="fab-slot" className="w-14" />;
            }
            if (item.path === "__more__") {
              return (
                <button
                  key="more"
                  onClick={() => setShowMore((v) => !v)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors",
                    showMore || isMoreActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {showMore ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                  <span className="font-medium">Mais</span>
                </button>
              );
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
    </>
  );
};
