import { useState } from "react";
import { useFinance } from "@/contexts/DataContext";
import { CATEGORY_LABELS } from "@/lib/types";
import { Plus, Trash2, PencilLine, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export const CategoryManager = () => {
  const { data, updateConfig } = useFinance();
  const customCats = data.config.customCategories || [];
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const builtIn = Object.entries(CATEGORY_LABELS);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    const key = newKey.trim() || newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const updated = [...customCats, { key, label: newLabel.trim() }];
    await updateConfig({ customCategories: updated } as any);
    setNewKey("");
    setNewLabel("");
  }

  async function handleDelete(idx: number) {
    const updated = customCats.filter((_, i) => i !== idx);
    await updateConfig({ customCategories: updated } as any);
  }

  async function handleEditConfirm(idx: number) {
    if (!editLabel.trim()) return;
    const updated = customCats.map((c, i) => i === idx ? { ...c, label: editLabel.trim() } : c);
    await updateConfig({ customCategories: updated } as any);
    setEditingIdx(null);
  }

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Categorias</h3>

      {/* Built-in categories */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Padrão</p>
        <div className="flex flex-wrap gap-1.5">
          {builtIn.map(([, label]) => (
            <span key={label} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Custom categories */}
      {customCats.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Personalizadas</p>
          <AnimatePresence>
            {customCats.map((cat, i) => (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2"
              >
                {editingIdx === i ? (
                  <>
                    <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-7 text-xs flex-1" />
                    <button onClick={() => handleEditConfirm(i)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingIdx(null)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary flex-1">{cat.label}</span>
                    <button
                      onClick={() => { setEditingIdx(i); setEditLabel(cat.label); }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <PencilLine className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add new */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nova categoria..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="h-8 text-xs flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" variant="outline" onClick={handleAdd} className="h-8 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
    </div>
  );
};
