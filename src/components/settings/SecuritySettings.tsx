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
  const { user, enableMfa, disableMfa } = useAuth();
  const { toast } = useToast();
  const [secret, setSecret] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  const handleEnableMfa = () => {
    const s = enableMfa();
    setSecret(s);
    toast({ title: "2FA habilitado", description: "Escaneie o QR Code no Google Authenticator." });
  };

  const handleDisableMfa = () => {
    disableMfa();
    setSecret(null);
    toast({ title: "2FA desabilitado" });
  };

  const qrUrl = secret
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/FinWar:${user?.email}?secret=${secret}%26issuer=FinWar`
    : null;

  return (
    <AppLayout>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="mb-6 text-xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" /> Segurança
      </h1>

      <div className="space-y-4">
        {/* 2FA Toggle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Autenticação em 2 fatores (2FA)</p>
              <p className="text-xs text-muted-foreground">Google Authenticator / TOTP</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${user?.mfaEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {user?.mfaEnabled ? "Ativo" : "Inativo"}
            </span>
          </div>

          {user?.mfaEnabled ? (
            <button onClick={handleDisableMfa} className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
              <ShieldOff className="h-4 w-4" /> Desativar 2FA
            </button>
          ) : (
            <button onClick={handleEnableMfa} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <ShieldCheck className="h-4 w-4" /> Ativar 2FA
            </button>
          )}
        </motion.div>

        {/* QR Code */}
        {qrUrl && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold">Escaneie no Google Authenticator</p>
            <div className="flex justify-center rounded-xl bg-white p-4">
              <img src={qrUrl} alt="QR Code 2FA" className="h-48 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-secondary px-3 py-2 font-mono text-xs">{secret}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(secret!); toast({ title: "Copiado!" }); }}
                className="rounded-lg bg-secondary p-2 hover:bg-muted transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Ou insira o código manualmente no app.</p>
          </motion.div>
        )}

        {/* Recovery Codes */}
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
