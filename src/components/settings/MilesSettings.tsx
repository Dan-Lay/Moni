import { AppLayout } from "@/components/layout/AppLayout";
import { useFinance } from "@/contexts/DataContext";
import { ArrowLeft, Plane, CreditCard, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Props {
  onBack: () => void;
}

export const MilesSettings = ({ onBack }: Props) => {
  const { data, updateConfig } = useFinance();
  const { toast } = useToast();

  const [mcBRL, setMcBRL] = useState(String(data.config.milhasConversaoMastercardBRL ?? 1.0));
  const [mcUSD, setMcUSD] = useState(String(data.config.milhasConversaoMastercardUSD ?? 2.0));
  const [visaBRL, setVisaBRL] = useState(String(data.config.milhasConversaoVisaBRL ?? 0.0));
  const [visaUSD, setVisaUSD] = useState(String(data.config.milhasConversaoVisaUSD ?? 0.0));
  const [saving, setSaving] = useState(false);

  const parseF = (v: string) => {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig({
        milhasConversaoMastercardBRL: parseF(mcBRL),
        milhasConversaoMastercardUSD: parseF(mcUSD),
        milhasConversaoVisaBRL: parseF(visaBRL),
        milhasConversaoVisaUSD: parseF(visaUSD),
      });
      toast({ title: "Fatores salvos!", description: "As milhas serão recalculadas automaticamente." });
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Configurações de Milhas</h1>
          <p className="text-xs text-muted-foreground">Fatores de conversão por bandeira e moeda</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Mastercard AAdvantage */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20">
              <CreditCard className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Mastercard — AAdvantage</h2>
              <p className="text-[10px] text-muted-foreground">American Airlines milhas</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fator BRL (nac.)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={mcBRL}
                onChange={(e) => setMcBRL(e.target.value)}
                className="h-9 text-sm font-mono"
                placeholder="1.0"
              />
              <p className="text-[10px] text-muted-foreground">
                R$100 → {Math.round(100 * parseF(mcBRL)).toLocaleString("pt-BR")} mi
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fator USD (intl.)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={mcUSD}
                onChange={(e) => setMcUSD(e.target.value)}
                className="h-9 text-sm font-mono"
                placeholder="2.0"
              />
              <p className="text-[10px] text-muted-foreground">
                R$100 intl → {Math.round(100 * parseF(mcUSD)).toLocaleString("pt-BR")} mi
              </p>
            </div>
          </div>
        </motion.div>

        {/* Visa */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
              <CreditCard className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Visa</h2>
              <p className="text-[10px] text-muted-foreground">Fator 0 = bandeira sem milhas</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Fator BRL (nac.)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={visaBRL}
                onChange={(e) => setVisaBRL(e.target.value)}
                className="h-9 text-sm font-mono"
                placeholder="0.0"
              />
              {parseF(visaBRL) === 0 && (
                <p className="text-[10px] text-muted-foreground">Sem milhas para compras nacionais</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fator USD (intl.)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={visaUSD}
                onChange={(e) => setVisaUSD(e.target.value)}
                className="h-9 text-sm font-mono"
                placeholder="0.0"
              />
              {parseF(visaUSD) === 0 && (
                <p className="text-[10px] text-muted-foreground">Sem milhas para compras internacionais</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Info note */}
        <div className="flex items-start gap-2 rounded-xl bg-secondary/50 px-4 py-3">
          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Lançamentos categorizados como <strong>Pagamento de Fatura</strong> são excluídos do cálculo para evitar duplicidade. Apenas cartões Mastercard e Visa geram milhas.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Plane className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Fatores"}
        </button>
      </div>
    </AppLayout>
  );
};
