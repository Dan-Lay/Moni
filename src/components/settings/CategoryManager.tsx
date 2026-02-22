import { useState } from "react";
import { useFinance } from "@/contexts/DataContext";
import { CATEGORY_LABELS } from "@/lib/types";
import { Plus, Trash2, PencilLine, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface CategoryItem {
  key: string;
  label: string;
  builtIn: boolean;
}

export const CategoryManager = () => {
  const { data, updateConfig } = useFinance();
  const customCats = data.config.customCategories || [];
  const hiddenBuiltIn = data.config.hiddenBuiltInCategories || [];
  const renamedBuiltIn: Record<string, string> = (data.config as any).renamedBuiltInCategories || {};

  const [newLabel, setNewLabel] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Merge built-in (not hidden) + custom into one list
  const allCategories: CategoryItem[] = [
    ...Object.entries(CATEGORY_LABELS)
      .filter(([key]) => !hiddenBuiltIn.includes(key))
      .map(([key, label]) => ({ key, label: renamedBuiltIn[key] || label, builtIn: true })),
    ...customCats.map((c) => ({ key: c.key, label: c.label, builtIn: false })),
  ];

  async function handleAdd() {
    if (!newLabel.trim()) return;
    const key = newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const updated = [...customCats, { key, label: newLabel.trim() }];
    await updateConfig({ customCategories: updated } as any);
    setNewLabel("");
  }

  async function handleDelete(cat: CategoryItem) {
    if (cat.builtIn) {
      // Hide built-in
      await updateConfig({ hiddenBuiltInCategories: [...hiddenBuiltIn, cat.key] } as any);
    } else {
      const updated = customCats.filter((c) => c.key !== cat.key);
      await updateConfig({ customCategories: updated } as any);
    }
  }

  async function handleEditConfirm(cat: CategoryItem) {
    if (!editLabel.trim()) return;
    if (cat.builtIn) {
      await updateConfig({ renamedBuiltInCategories: { ...renamedBuiltIn, [cat.key]: editLabel.trim() } } as any);
    } else {
      const updated = customCats.map((c) => c.key === cat.key ? { ...c, label: editLabel.trim() } : c);
      await updateConfig({ customCategories: updated } as any);
    }
    setEditingKey(null);
  }

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Categorias</h3>

      <div className="space-y-1.5">
        <AnimatePresence>
          {allCategories.map((cat) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2"
            >
              {editingKey === cat.key ? (
                <>
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-7 text-xs flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleEditConfirm(cat)} />
                  <button onClick={() => handleEditConfirm(cat)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setEditingKey(null)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className={`rounded-full px-2.5 py-1 text-xs flex-1 ${cat.builtIn ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                    {cat.label}
                    {cat.builtIn && <span className="ml-1 text-[10px] opacity-50">(padrão)</span>}
                  </span>
                  <button
                    onClick={() => { setEditingKey(cat.key); setEditLabel(cat.label); }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PencilLine className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
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
