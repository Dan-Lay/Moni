
# Plano de Implementacao: Subcategorias, Scroll e Graficos (Corrigido)

## Ressalvas do utilizador incorporadas

1. **Supabase e nao PocketBase**: O ficheiro `src/lib/pocketbase.ts` e na verdade o modulo Supabase (nome legado). Todas as funcoes CRUD ja usam `supabase` client. O campo `subcategory` sera adicionado em TODOS os pontos de escrita: `createTransactions`, `updateTransaction`, `createPlannedEntry`, `updatePlannedEntryRemote`, e nos mapeadores `mapTransaction`/`mapPlannedEntry`.

2. **Meta nao inflacionada**: Ao calcular receitas para a meta de 15%, aplicar os mesmos filtros: excluir `reconciliationStatus === 'ja_conciliado'` para evitar duplicados/transferencias inflarem o valor.

3. **Classes exatas do scroll**: `className="w-full max-h-[55vh] md:max-h-[60vh] overflow-y-auto border rounded-md p-2 block relative"`

---

## 1. Migracao SQL (Supabase)

Adicionar coluna `subcategory TEXT DEFAULT NULL` nas 3 tabelas:
- `transactions`
- `planned_entries`
- `categorization_rules`

---

## 2. Tipos e constantes (`src/lib/types.ts`)

- Criar tipo `InvestmentSubcategory = 'emergencia' | 'renda_fixa' | 'previdencia' | 'fiis' | 'acoes' | 'cripto'`
- Criar `INVESTMENT_SUBCATEGORY_LABELS` com rotulos PT-BR
- Criar `INVESTMENT_SUBCATEGORY_ORDER` (array ordenado)
- Adicionar campo opcional `subcategory?: InvestmentSubcategory` em `Transaction` e `PlannedEntry`

---

## 3. Mapeadores Supabase (`src/lib/pocketbase.ts`)

### Leitura (mappers):
- `mapTransaction`: adicionar `subcategory: r.subcategory || undefined`
- `mapPlannedEntry`: adicionar `subcategory: r.subcategory || undefined`

### Escrita (CRUD):
- `createTransactions` (linha 107-125): adicionar `subcategory: tx.subcategory ?? null` no objeto de insert
- `updateTransaction` (linha 137-152): adicionar `if (patch.subcategory !== undefined) data.subcategory = patch.subcategory;` e expandir o tipo do patch
- `createPlannedEntry` (linha 242-255): adicionar `subcategory: entry.subcategory ?? null`
- `updatePlannedEntryRemote` (linha 258-271): adicionar `if (patch.subcategory !== undefined) data.subcategory = patch.subcategory;`

---

## 4. Rules Engine (`src/lib/rules-engine.ts`)

- Adicionar `subcategory?: string` ao tipo `CategorizationRule`
- No `fetchCategorizationRules`: mapear `subcategory: r.subcategory || undefined`
- No `createCategorizationRule`: incluir `subcategory` no insert
- No `upsertCategorizationRule`: aceitar e persistir `subcategory`; incluir no update e no create
- No `matchRule`: retornar regra com subcategory (ja incluido no objeto retornado)

---

## 5. DataContext (`src/contexts/DataContext.tsx`)

- Expandir tipo do patch em `updateTransaction` para incluir `subcategory`
- Expandir tipo do patch em `handleUpdateTransaction` (linha 279-288)

---

## 6. Scroll do Upload (`src/pages/UploadPage.tsx`)

- **Linha 687**: trocar `className="flex-1 w-full overflow-y-auto h-[400px] min-h-[300px] border rounded-md p-2"` por `className="w-full max-h-[55vh] md:max-h-[60vh] overflow-y-auto border rounded-md p-2 block relative"`
- **Linha 596**: adicionar `overflow-hidden` ao container pai `glass-card`

---

## 7. UI Subcategoria no Upload (`src/pages/UploadPage.tsx`)

- Na review row (apos o select de categoria, linha ~655-670): quando `row.tx.category === 'investimentos'`, mostrar um segundo `<select>` com as opcoes de subcategoria
- No dialogo de criacao de regra: incluir campo subcategoria se categoria = investimentos
- Ao salvar regra e ao confirmar import: propagar subcategory

---

## 8. UI Subcategoria no Extrato (`src/pages/Transactions.tsx`)

- No `UnifiedRow`: adicionar campo `subcategory?: string`
- No `startEdit`: carregar subcategory no estado
- No formulario de edicao inline: quando `editCat === 'investimentos'`, mostrar Select de subcategoria
- No `confirmEdit`: incluir subcategory no patch e no upsert da regra

---

## 9. UI Subcategoria nos Lancamentos (`src/pages/PlannedEntries.tsx`)

- No `emptyForm`: adicionar `subcategory: '' as string`
- No formulario: quando `form.category === 'investimentos'`, mostrar Select de subcategoria
- No `handleAdd`: propagar subcategory para o PlannedEntry

---

## 10. Card Liberdade Financeira (`src/components/dashboard/LiberdadeFinanceira.tsx`)

Refatoracao completa da logica de calculo:

**Meta (denominador):**
- Somar todas as receitas do mes (`amount > 0`) EXCLUINDO `reconciliationStatus === 'ja_conciliado'`
- Multiplicar por `aportePercentual / 100`

**Total investido (numerador):**
- Somar transacoes reais do mes com `category === 'investimentos'` e `amount < 0` e `reconciliationStatus !== 'ja_conciliado'`
- Somar planned entries do mes com `category === 'investimentos'` e `!conciliado`
- Somar desapego vendido (manter logica existente)

**Breakdown por subcategoria:**
- Agrupar valores reais por `subcategory` usando `INVESTMENT_SUBCATEGORY_ORDER`
- Remover valores hardcoded (`cfg.investPrevidencia`, etc.)
- Usar icones ja existentes (Shield, PiggyBank, Landmark, Building2, BarChart3, Bitcoin)

---

## 11. Grafico Gastos por Categoria (`src/components/dashboard/ExpensePieChart.tsx`)

**Filtragem reforçada:**
- Processar apenas transacoes onde `amount < 0` (ja existe)
- Adicionar: excluir `reconciliationStatus === 'ja_conciliado'`

**Ordenacao dinamica:**
- Apos agrupar por categoria, ordenar `chartData` do maior para o menor valor antes de renderizar

**sumByCategory (`src/lib/storage.ts`):**
- Adicionar filtro: `t.reconciliationStatus !== 'ja_conciliado'` na funcao `sumByCategory` (linha 129-133)

---

## Secção Tecnica: Sequencia de Execucao

1. Migracao SQL (3 ALTER TABLE)
2. `src/lib/types.ts` - tipos e constantes
3. `src/lib/pocketbase.ts` - mappers + CRUD com subcategory
4. `src/lib/rules-engine.ts` - regras com subcategory
5. `src/contexts/DataContext.tsx` - patch types
6. `src/lib/storage.ts` - filtro ja_conciliado no sumByCategory
7. `src/pages/UploadPage.tsx` - scroll fix + UI subcategoria
8. `src/pages/Transactions.tsx` - UI subcategoria
9. `src/pages/PlannedEntries.tsx` - UI subcategoria
10. `src/components/dashboard/LiberdadeFinanceira.tsx` - nova logica
11. `src/components/dashboard/ExpensePieChart.tsx` - filtragem + ordenacao

**Ficheiros afetados:** 10 ficheiros + 1 migracao SQL
