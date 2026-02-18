import { AppLayout } from "@/components/layout/AppLayout";
import { Upload as UploadIcon, FileText, FileSpreadsheet, CheckCircle, AlertCircle, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { parseOFX, parseCSV } from "@/lib/parsers";
import { useAppData } from "@/contexts/DataContext";
import { Transaction } from "@/lib/types";

const UploadPage = () => {
  const { addTransactions } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ count: number; miles: number; source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceHint, setSourceHint] = useState("santander");

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);

      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();
      let txs: Transaction[] = [];

      try {
        if (ext === "ofx" || ext === "qfx") {
          txs = parseOFX(text, sourceHint);
        } else if (ext === "csv" || ext === "txt") {
          txs = parseCSV(text, sourceHint);
        } else {
          setError(`Formato .${ext} não suportado. Use OFX ou CSV.`);
          return;
        }

        if (txs.length === 0) {
          setError("Nenhuma transação encontrada no arquivo. Verifique o formato.");
          return;
        }

        addTransactions(txs);
        const totalMiles = txs.reduce((a, t) => a + t.milesGenerated, 0);
        setResult({ count: txs.length, miles: totalMiles, source: file.name });
      } catch (e) {
        setError("Erro ao processar arquivo. Verifique se o formato está correto.");
      }
    },
    [addTransactions, sourceHint]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <AppLayout>
      <h1 className="mb-4 text-xl font-bold">Upload de Extratos</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Processamento 100% local — seus dados nunca saem do navegador.
      </p>

      {/* Source selector */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Banco de origem:</span>
        {["santander", "bradesco", "nubank"].map((s) => (
          <button
            key={s}
            onClick={() => setSourceHint(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
              sourceHint === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`glass-card flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <UploadIcon className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mb-1 text-lg font-semibold">Arraste seus arquivos aqui</h2>
        <p className="mb-6 text-sm text-muted-foreground">OFX e CSV suportados</p>
        <input
          ref={fileRef}
          type="file"
          accept=".ofx,.qfx,.csv,.txt"
          className="hidden"
          onChange={handleChange}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
        >
          Selecionar Arquivo
        </button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 glass-card rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-primary">Upload processado com sucesso!</p>
                <p className="mt-1 text-xs text-muted-foreground">{result.source}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary/50 px-3 py-2">
                    <p className="font-mono text-lg font-bold">{result.count}</p>
                    <p className="text-[10px] text-muted-foreground">transações importadas</p>
                  </div>
                  <div className="rounded-lg bg-accent/10 px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Plane className="h-3 w-3 text-accent" />
                      <p className="font-mono text-lg font-bold text-accent">{result.miles.toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">milhas AAdvantage geradas</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 glass-card rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { icon: FileText, label: "OFX / QFX", desc: "Extrato bancário padrão — parsing de STMTTRN" },
          { icon: FileSpreadsheet, label: "CSV / TXT", desc: "Detecta colunas data, valor e descrição" },
        ].map((item) => (
          <div key={item.label} className="glass-card flex items-center gap-3 rounded-xl p-4">
            <item.icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default UploadPage;
