
# Correcoes Criticas - Upload e Transacoes

## 1. Fix de Scroll no Upload (UploadPage.tsx)

Substituir o `ScrollArea` (linha 604) por uma `div` nativa com `overflow-y-auto` e `max-h-[60vh]`. O `ScrollArea` do Radix nem sempre respeita a altura maxima dentro de containers flexiveis. A `div` nativa resolve o problema de forma confiavel.

**Linha 604:** `<ScrollArea className="max-h-[55vh]">` sera substituida por `<div className="overflow-y-auto max-h-[60vh]">` (e o `</ScrollArea>` correspondente na linha 673).

---

## 2. Renomear filtro para "AutoTag" e corrigir filtragem visual (UploadPage.tsx)

- **Linha 592:** Renomear "So auto-categorizados" para "AutoTag".
- **Filtragem visual:** Quando `onlyCategorized` estiver ativo, esconder visualmente as rows com `status === "pending"` na lista de review (atualmente so afeta o `importableCount`, nao a lista).
- Adicionar condicao no `.map()` da lista (linha 606): `if (onlyCategorized && row.status === "pending") return null;`.

---

## 3. Acordeao para Conciliados Automaticamente (UploadPage.tsx)

Separar as `reviewRows` em dois grupos antes da renderizacao:
- **Grupo 1 (sempre visivel):** Rows onde `reconciliation?.action` nao seja `"skip_duplicate"` nem `"reconciled_manual"`.
- **Grupo 2 (acordeao fechado):** Rows com `reconciliation?.action === "skip_duplicate"` ou `"reconciled_manual"`.

Usar o componente `Collapsible` (ja existe em `src/components/ui/collapsible.tsx`) para o Grupo 2, fechado por defeito. O trigger mostrara "X lancamento(s) ja conciliado(s) — clique para ver".

Importar `Collapsible, CollapsibleTrigger, CollapsibleContent` e `ChevronsUpDown` no topo do ficheiro.

---

## 4. Performance do File Picker (UploadPage.tsx)

- **Linha 474:** Alterar o `accept` de `.ofx,.qfx,.csv,.txt,.pdf` para `.csv,.ofx,.qfx,application/pdf`. Isto mantem o suporte a PDF mas usa MIME type especifico para evitar scanning lento no Windows.
- Mover a callback `handleChange` para usar `useCallback` com dependencia estavel (ja esta feito) e garantir que o `fileRef` nao gera re-renders.
- O `useRef` ja esta estavel (linha 92). Nenhuma mudanca adicional necessaria — o problema principal e o `accept`.

---

## 5. Exclusao Individual e em Massa (Transactions.tsx + DataContext + pocketbase.ts + mock-pocketbase.ts)

### 5a. Servico Supabase (src/lib/pocketbase.ts)
Adicionar duas funcoes ao ficheiro que contem as funcoes CRUD do Supabase:

```text
deleteTransaction(id: string)
  -> supabase.from("transactions").delete().eq("id", id)

deleteTransactions(ids: string[])
  -> supabase.from("transactions").delete().in("id", ids)
```

A seguranca e garantida pelo RLS do Supabase (politica `user_id = auth.uid()`).

### 5b. Mock (src/lib/mock-pocketbase.ts)
Adicionar stubs equivalentes para o modo mock.

### 5c. DataContext (src/contexts/DataContext.tsx)
- Adicionar `deleteTransaction(id: string)` e `deleteTransactions(ids: string[])` ao `FinanceContextType`.
- Implementar handlers que chamam a API e removem do state local.
- Expor no Provider.

### 5d. UI - Exclusao Individual (Transactions.tsx)
- Ao lado do botao de edicao (PencilLine, linha 444), adicionar icone `Trash2`.
- Ao clicar, abre um `AlertDialog` pedindo confirmacao.
- Apos confirmar, chama `deleteTransaction(id)`.

### 5e. UI - Exclusao em Massa (Transactions.tsx)
- Na barra de bulk edit (linha 228-247), adicionar botao "Excluir Selecionados" ao lado do "Aplicar".
- Desabilitado quando `selectedIds.size === 0`.
- Ao clicar, abre `AlertDialog` com contagem de itens.
- Apos confirmar, chama `deleteTransactions(Array.from(selectedIds))` e limpa a selecao.

---

## Resumo de Ficheiros Afetados

| Ficheiro | Alteracoes |
|---|---|
| `src/pages/UploadPage.tsx` | Scroll fix, AutoTag, acordeao, accept do file picker |
| `src/pages/Transactions.tsx` | Exclusao individual + em massa com AlertDialog |
| `src/contexts/DataContext.tsx` | Novas funcoes deleteTransaction/deleteTransactions |
| `src/lib/pocketbase.ts` | Funcoes DELETE no Supabase |
| `src/lib/mock-pocketbase.ts` | Stubs mock para delete |
