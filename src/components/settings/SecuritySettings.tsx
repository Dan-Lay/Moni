import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ShieldCheck, ShieldOff, Copy, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onBack: () => void;
}

const FAKE_RECOVERY_CODES = [
  "A1B2-C3D4", "E5F6-G7H8", "J9K0-L1M2",
  "N3P4-Q5R6", "S7T8-U9V0", "W1X2-Y3Z4",
];

export const SecuritySettings = ({ onBack }: Props) => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [showRecovery, setShowRecovery] = useState(false);

  const handleToggleMfa = async () => {
    const newState = !user?.mfaEnabled;
    await updateProfile({ mfaEnabled: newState });
    toast({ title: newState ? "2FA habilitado" : "2FA desabilitado" });
  };

  return (
    <AppLayout>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="mb-6 text-xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" /> Segurança
      </h1>

      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Autenticação em 2 fatores (2FA)</p>
              <p className="text-xs text-muted-foreground">Configuração visual (placeholder)</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${user?.mfaEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {user?.mfaEnabled ? "Ativo" : "Inativo"}
            </span>
          </div>

          {user?.mfaEnabled ? (
            <button onClick={handleToggleMfa} className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
              <ShieldOff className="h-4 w-4" /> Desativar 2FA
            </button>
          ) : (
            <button onClick={handleToggleMfa} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <ShieldCheck className="h-4 w-4" /> Ativar 2FA
            </button>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Códigos de Recuperação</p>
              <p className="text-xs text-muted-foreground">Guarde em local seguro</p>
            </div>
            <button
              onClick={() => setShowRecovery(!showRecovery)}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              {showRecovery ? "Ocultar" : "Exibir"}
            </button>
          </div>

          {showRecovery && (
            <div className="grid grid-cols-2 gap-2">
              {FAKE_RECOVERY_CODES.map((c) => (
                <code key={c} className="rounded-lg bg-secondary px-3 py-2 text-center font-mono text-xs">{c}</code>
              ))}
            </div>
          )}

          <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-3 w-3" /> Gerar novos códigos
          </button>
        </motion.div>
      </div>
    </AppLayout>
  );
};
