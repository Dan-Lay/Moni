import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Swords, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";

const Verify2FAPage = () => {
  const { user, verifyMfa, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const handleVerify = () => {
    if (verifyMfa(code)) {
      toast({ title: "Acesso liberado!", description: "Bem-vindo(a) de volta, Guerreiro(a)." });
      navigate("/", { replace: true });
    } else {
      toast({ title: "Código inválido", description: "Digite os 6 dígitos do seu autenticador.", variant: "destructive" });
      setCode("");
    }
  };

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 glow-accent">
            <ShieldCheck className="h-8 w-8 text-accent" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Verificação 2FA</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Digite o código do Google Authenticator
            </p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <span className="text-muted-foreground mx-2">—</span>
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <button
            onClick={handleVerify}
            disabled={code.length < 6}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Verificar e Entrar
          </button>

          <button
            onClick={() => { logout(); navigate("/login", { replace: true }); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sair e usar outra conta
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Verify2FAPage;
