import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, Bell, CreditCard, Plane } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface Props {
  onBack: () => void;
}

interface NotifToggle {
  id: string;
  icon: typeof Bell;
  title: string;
  desc: string;
}

const TOGGLES: NotifToggle[] = [
  { id: "fatura", icon: CreditCard, title: "Fatura Fechando", desc: "Alerta 3 dias antes do fechamento do cartão" },
  { id: "disney", icon: Plane, title: "Meta Disney Atingida", desc: "Notificação quando milhas ou USD atingirem a meta" },
  { id: "planned", icon: Bell, title: "Lançamentos", desc: "Lembrete de lançamentos planejados próximos do vencimento" },
];

export const NotificationSettings = ({ onBack }: Props) => {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("moni_notif_prefs");
    return saved ? JSON.parse(saved) : { fatura: true, disney: true, planned: false };
  });

  const toggle = (id: string) => {
    const next = { ...enabled, [id]: !enabled[id] };
    setEnabled(next);
    localStorage.setItem("moni_notif_prefs", JSON.stringify(next));
  };

  return (
    <AppLayout>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="mb-6 text-xl font-bold flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" /> Notificações
      </h1>

      <div className="space-y-4">
        {TOGGLES.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="glass-card flex items-center gap-4 rounded-2xl p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.id)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                enabled[item.id] ? "bg-primary" : "bg-secondary"
              }`}
            >
              <motion.div
                layout
                className="absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-md"
                style={{ left: enabled[item.id] ? "calc(100% - 1.625rem)" : "0.125rem" }}
              />
            </button>
          </motion.div>
        ))}

        <p className="text-center text-xs text-muted-foreground pt-2">
          Notificações reais serão ativadas após integração com o backend.
        </p>
      </div>
    </AppLayout>
  );
};
