import { AppLayout } from "@/components/layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, User, Shield, Bell, Palette } from "lucide-react";
import { motion } from "framer-motion";

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();

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
          { icon: User, title: "Conta", desc: "Perfil e dados pessoais" },
          { icon: Shield, title: "Segurança", desc: "2FA e autenticação" },
          { icon: Bell, title: "Notificações", desc: "Alertas e lembretes" },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * (i + 1) }}
            className="glass-card flex items-center gap-4 rounded-2xl p-5 cursor-pointer hover:bg-secondary/50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
