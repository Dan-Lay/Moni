import { AppLayout } from "@/components/layout/AppLayout";
import { Upload as UploadIcon, FileText, FileSpreadsheet, CheckCircle, AlertCircle, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { parseOFX, parseCSV } from "@/lib/parsers";
import { useFinance } from "@/contexts/DataContext";
import { Transaction, formatMiles } from "@/lib/types";

const UploadPage = () => {
  const { addTransactions, data } = useFinance();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ count: number; miles: number; source: string; spouseCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceHint, setSourceHint] = useState("santander");

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();
    const cotacaoDolar = data.config.cotacaoDolar;
    let txs: Transaction[] = [];
    try {
      if (ext === "ofx" || ext === "qfx") txs = parseOFX(text, sourceHint, cotacaoDolar);
      else if (ext === "csv" || ext === "txt") txs = parseCSV(text, sourceHint, cotacaoDolar);
      else { setError(`Formato .${ext} não suportado. Use OFX ou CSV.`); return; }
      if (txs.length === 0) { setError("Nenhuma transação encontrada no arquivo."); return; }
      addTransactions(txs);
      const spouseTxs = txs.filter((t) => t.isAdditionalCard).length;
      setResult({
        count: txs.length,
        miles: txs.reduce((a, t) => a + t.milesGenerated, 0),
        source: file.name,
        spouseCount: spouseTxs,
      });
    } catch { setError("Erro ao processar arquivo."); }
  }, [addTransactions, sourceHint, data.config.cotacaoDolar]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }, [processFile]);
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); }, [processFile]);

  return (
    <AppLayout>
      <h1 className="mb-4 text-xl font-bold">Upload de Extratos</h1>
      <p className="mb-6 text-sm text-muted-foreground">Processamento 100% local — seus dados nunca saem do navegador.</p>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Banco:</span>
        {["santander", "bradesco", "nubank"].map((s) => (
          <button key={s} onClick={() => setSourceHint(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${sourceHint === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
        className={`glass-card flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><UploadIcon className="h-7 w-7 text-primary" /></div>
        <h2 className="mb-1 text-lg font-semibold">Arraste seus arquivos aqui</h2>
        <p className="mb-6 text-sm text-muted-foreground">OFX e CSV suportados</p>
        <input ref={fileRef} type="file" accept=".ofx,.qfx,.csv,.txt" className="hidden" onChange={handleChange} />
        <button onClick={() => fileRef.current?.click()} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">Selecionar Arquivo</button>
      </motion.div>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 glass-card rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">Upload processado!</p>
                <p className="mt-1 text-xs text-muted-foreground">{result.source}</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-secondary/50 px-3 py-2">
                    <p className="font-mono text-lg font-bold">{result.count}</p>
                    <p className="text-[10px] text-muted-foreground">transações</p>
                  </div>
                  <div className="rounded-lg bg-accent/10 px-3 py-2">
                    <div className="flex items-center gap-1"><Plane className="h-3 w-3 text-accent" /><p className="font-mono text-lg font-bold text-accent">{formatMiles(result.miles)}</p></div>
                    <p className="text-[10px] text-muted-foreground">milhas AA</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 px-3 py-2">
                    <p className="font-mono text-lg font-bold">{result.spouseCount}</p>
                    <p className="text-[10px] text-muted-foreground">Esposa 💜</p>
                  </div>
                </div>
                {result.spouseCount > 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    ✓ {result.spouseCount} transação(ões) detectada(s) como cartão adicional (Esposa)
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" /><p className="text-sm text-destructive">{error}</p></div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[{ icon: FileText, label: "OFX / QFX", desc: "Extrato bancário — parsing de STMTTRN" }, { icon: FileSpreadsheet, label: "CSV / TXT", desc: "Detecta colunas data, valor e descrição" }].map((item) => (
          <div key={item.label} className="glass-card flex items-center gap-3 rounded-xl p-4">
            <item.icon className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-semibold">{item.label}</p><p className="text-[11px] text-muted-foreground">{item.desc}</p></div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default UploadPage;
