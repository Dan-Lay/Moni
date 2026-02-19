import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/DataContext";
import { ArrowLeft, User, Camera, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { clearLayoutStorage, resetLayoutInPB } from "@/lib/dashboard-layout";
type ViewProfile = "marido" | "esposa" | "todos";

interface Props {
  onBack: () => void;
}

export const AccountSettings = ({ onBack }: Props) => {
  const { user, updateProfile, isMockMode } = useAuth();
  const { setProfileFilter } = useFinance();
  const { toast } = useToast();

  const handleResetLayout = async () => {
    if (isMockMode) {
      clearLayoutStorage();
    } else if (user?.id) {
      await resetLayoutInPB(user.id);
    }
    toast({ title: "Layout resetado", description: "A Moni restaurou o layout padrão do Dashboard. Recarregue a página para ver." });
  };

  const handleNameChange = (name: string) => {
    updateProfile({ name });
  };

  const handleProfileChange = (profile: ViewProfile) => {
    updateProfile({ defaultProfile: profile });
    setProfileFilter(profile);
    toast({ title: "Perfil atualizado", description: `Visualização padrão: ${profile === "marido" ? "Marido" : "Esposa"}` });
  };

  return (
    <AppLayout>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="mb-6 text-xl font-bold flex items-center gap-2">
        <User className="h-5 w-5 text-primary" /> Conta
      </h1>

      <div className="space-y-4">
        {/* Avatar + Name */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-muted-foreground">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || "?"
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input
                value={user?.name || ""}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">E-mail</Label>
            <p className="mt-1 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground font-mono">
              {user?.email || "—"}
            </p>
          </div>
        </motion.div>

        {/* Default Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold">Perfil de Visualização Padrão</p>
          <p className="text-xs text-muted-foreground">Define qual perspectiva o Dashboard carrega por padrão.</p>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {(["todos", "marido", "esposa"] as ViewProfile[]).map((p) => (
              <button
                key={p}
                onClick={() => handleProfileChange(p)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  user?.defaultProfile === p
                    ? "border-primary bg-primary/10 text-primary glow-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                {p === "todos" ? "👨‍👩‍👧 Família" : p === "marido" ? "🧔 Marido" : "👩 Esposa"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Reset Dashboard Layout */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold">Layout do Dashboard</p>
          <p className="text-xs text-muted-foreground">Restaure o layout padrão caso tenha reorganizado os cards.</p>
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-destructive/30 hover:text-destructive transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Resetar Layout do Dashboard
          </button>
        </motion.div>
      </div>
    </AppLayout>
  );
};
