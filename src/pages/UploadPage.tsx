import { AppLayout } from "@/components/layout/AppLayout";
import { Upload as UploadIcon, FileText, FileSpreadsheet, File } from "lucide-react";
import { motion } from "framer-motion";

const UploadPage = () => {
  return (
    <AppLayout>
      <h1 className="mb-6 text-xl font-bold">Upload de Extratos</h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-10 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <UploadIcon className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mb-1 text-lg font-semibold">Arraste seus arquivos aqui</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Suportamos OFX, CSV e PDF
        </p>
        <button className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
          Selecionar Arquivo
        </button>
      </motion.div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: FileText, label: "OFX", desc: "Extrato bancário padrão" },
          { icon: FileSpreadsheet, label: "CSV", desc: "Planilhas de gastos" },
          { icon: File, label: "PDF", desc: "Faturas de cartão" },
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
