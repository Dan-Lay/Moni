import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const { isAuthenticated, isLoading, login, register, isMockMode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
        toast({ title: "Conta criada!", description: "A Moni está pronta para te ajudar!" });
      } else {
        await login(email, password);
        toast({ title: "Bem-vinda de volta! 💜", description: "A Moni preparou tudo para você." });
      }
      // login() já setou o user — navegar agora é seguro
      navigate("/", { replace: true });
    } catch (err: any) {
      const msg = err?.message ?? "";
      const friendly =
        msg.includes("Invalid login credentials") ||
        msg.includes("invalid_grant") ||
        msg.includes("Email not confirmed") ||
        msg.includes("No API key") ||
        msg.includes("apikey") ||
        msg.includes("Forbidden")
          ? "Senha ou e-mail incorretos, verifique novamente."
          : msg.includes("User already registered")
          ? "Este e-mail já está cadastrado. Tente fazer login."
          : msg.includes("Password should be")
          ? "A senha deve ter pelo menos 8 caracteres."
          : "Não foi possível conectar. Verifique sua conexão e tente novamente.";
      toast({ title: "Acesso negado", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 glow-primary">
            <Sparkles className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">
            {loading ? "Entrando..." : "Restaurando sessão..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 glow-primary"
          >
            <Sparkles className="h-10 w-10 text-primary" />
          </motion.div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Mo<span className="text-gradient-gold">ni</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua inteligência financeira
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 space-y-5"
        >
          <div className="text-center">
            <h2 className="text-lg font-semibold">{isRegister ? "Criar Conta" : "Entrar"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isRegister ? "Preencha seus dados" : "Use suas credenciais"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegister}
                  className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Aguarde..." : isRegister ? "Criar Conta" : "Entrar"}
            </button>
          </form>

          <button
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isRegister ? "Já tem conta? Entrar" : "Não tem conta? Criar"}
          </button>

          {isMockMode && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-3 text-center space-y-1">
              <p className="text-xs font-semibold text-primary">✨ Modo Demonstração</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Oi! Eu sou a Moni. Por enquanto, seu banco de dados está offline, então preparei esse ambiente de demonstração para você explorar.
              </p>
            </div>
          )}

          <p className="text-center text-[10px] text-muted-foreground">
            Conectada a{" "}
            <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">
              {isMockMode ? "Demonstração" : "Supabase"}
            </code>
          </p>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground/50">
          Moni — Sua assistente financeira 💜
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
