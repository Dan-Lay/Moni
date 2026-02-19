import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, User, Shield, Bell, Palette, LogOut, ChevronRight, Tags } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { useNavigate } from "react-router-dom";

type SettingsTab = "main" | "security" | "account" | "notifications";

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>("main");

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (activeTab === "security") return <SecuritySettings onBack={() => setActiveTab("main")} />;
  if (activeTab === "account") return <AccountSettings onBack={() => setActiveTab("main")} />;
  if (activeTab === "notifications") return <NotificationSettings onBack={() => setActiveTab("main")} />;

  return (
    <AppLayout>
      <h1 className="mb-6 text-xl font-bold">Configurações</h1>

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Aparência</h2>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="h-5 w-5 text-accent" />
              ) : (
                <Sun className="h-5 w-5 text-accent" />
              )}
              <div>
                <p className="text-sm font-medium">Modo {theme === "dark" ? "Escuro" : "Claro"}</p>
                <p className="text-xs text-muted-foreground">Alternar tema do aplicativo</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                theme === "dark" ? "bg-primary" : "bg-secondary"
              }`}
            >
              <motion.div
                layout
                className="absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-md"
                style={{ left: theme === "dark" ? "calc(100% - 1.625rem)" : "0.125rem" }}
              />
            </button>
          </div>
        </motion.div>

        {[
          { icon: User, title: "Conta", desc: "Perfil e dados pessoais", tab: "account" as SettingsTab },
          { icon: Shield, title: "Segurança", desc: "2FA e autenticação", tab: "security" as SettingsTab },
          { icon: Bell, title: "Notificações", desc: "Alertas e lembretes", tab: "notifications" as SettingsTab },
        ].map((item, i) => (
          <motion.button
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * (i + 1) }}
            onClick={() => setActiveTab(item.tab)}
            className="glass-card flex w-full items-center gap-4 rounded-2xl p-5 cursor-pointer hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        ))}

        {/* Category Manager */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CategoryManager />
        </motion.div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={handleLogout}
          className="flex w-full items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 hover:bg-destructive/10 transition-colors text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <LogOut className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">Sair</p>
            <p className="text-xs text-muted-foreground">Encerrar sessão</p>
          </div>
        </motion.button>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
