

# Orcamento: Metas por Categoria (Envelope Budgeting)

## Status: ✅ Implementado

## Resumo
A tela de Orçamento foi completamente refatorada para usar o modelo de **Metas Mensais por Categoria** (Envelope Budgeting), substituindo os lançamentos individuais.

---

## Arquitetura

### Tabela Supabase: `category_budgets`
- `id`, `user_id`, `category`, `month` (YYYY-MM), `amount`
- UNIQUE constraint em `(user_id, category, month)`
- Subcategorias de investimentos usam prefixo: `investimentos:emergencia`, `investimentos:renda_fixa`, etc.

### Tipo TypeScript: `CategoryBudget`
- `{ id, category, month, amount }` em `types.ts`
- Adicionado ao `AppData`

### CRUD: `pocketbase.ts`
- `fetchCategoryBudgets(userId, month)`
- `upsertCategoryBudget(userId, category, month, amount)`
- `deleteCategoryBudget(id)`

### DataContext
- Estado `categoryBudgets` carregado no `loadData`
- Métodos expostos: `upsertCategoryBudget`, `deleteCategoryBudget`, `loadBudgetsForMonth`
- Listener Realtime para INSERT/UPDATE/DELETE na tabela `category_budgets`

---

## UI: PlannedEntries.tsx (reescrita completa)

1. **Seletor de Mês**: Setas esquerda/direita com label capitalizado
2. **3 Cards de Resumo**: Planejado, Realizado, Economia
3. **Barra de Progresso Mestre**: h-4 rounded-full com cores dinâmicas (verde/amarelo/vermelho)
4. **Lista de Categorias**: Ícone colorido + nome + barra fina + R$ Realizado / R$ Orçado (XX%) + badge de status
5. **Investimentos Accordion**: Expandível com 6 subcategorias editáveis individualmente
6. **Edição Inline**: Input com máscara de moeda + botão Salvar **desabilitado durante a requisição** + check verde de sucesso por 1.5s

## Dashboard Integration
- **LiberdadeFinanceira**: Busca orçado de `categoryBudgets` (investimentos:*)
- **ExpensePieChart**: Busca orçado pendente de `categoryBudgets` em vez de `plannedEntries`
- **CashFlowChart**: Mantém `plannedEntries` (precisa de datas específicas)

## Ficheiros alterados
- `src/lib/types.ts` — `CategoryBudget` + `AppData.categoryBudgets`
- `src/lib/pocketbase.ts` — CRUD category_budgets
- `src/lib/mock-pocketbase.ts` — Stubs mock
- `src/contexts/DataContext.tsx` — Estado + métodos + Realtime
- `src/pages/PlannedEntries.tsx` — Reescrita completa
- `src/components/dashboard/LiberdadeFinanceira.tsx` — Usa categoryBudgets
- `src/components/dashboard/ExpensePieChart.tsx` — Usa categoryBudgets
