

# Orcamento + Liberdade Financeira (com Protecoes Matematicas)

## Resumo
Renomear "Lancamentos" para "Orcamento", adicionar painel de resumo orcamentario, e refatorar completamente o card Liberdade Financeira com nova logica de metas baseada no orcamento.

---

## 1. Renomear navegacao (3 ficheiros, 4 linhas)

- `DesktopSidebar.tsx` linha 9: `"Lançamentos"` -> `"Orçamento"`
- `BottomNav.tsx` linha 11: `"Lançam."` -> `"Orçam."`
- `PlannedEntries.tsx` linha 104: `"Lançamentos"` -> `"Orçamento"`
- `PlannedEntries.tsx` linha 127: `"Novo Lançamento"` -> `"Novo Orçamento"`

---

## 2. Painel de Resumo Orcamentario (PlannedEntries.tsx)

Inserir um `glass-card` entre o header e o formulario (antes da linha 118) que:

- Filtra `data.plannedEntries` do mes atual (por `dueDate`)
- Agrupa por `category`, usando `Math.abs(amount)` para cada entrada (RESSALVA 1)
- Separa visualmente receitas (`amount > 0`) de saidas (`amount < 0`)
- Exibe apenas o Total Orcado de Saidas (Despesas + Investimentos) para foco no controlo de gastos (RESSALVA 3)
- Destaca a linha de Investimentos com cor `text-primary`

```text
+------------------------------------------+
|  Orcamento do Mes - Marco 2026           |
|  Receitas:                               |
|    Salario ................. R$ 12.000    |
|  Saidas Orcadas:                         |
|    Habitacao ............... R$ 1.500     |
|    Investimentos ........... R$ 1.800     |
|  Total Saidas: R$ 5.300                  |
+------------------------------------------+
```

---

## 3. Refatoracao do LiberdadeFinanceira.tsx

### 3a. Nova logica de Meta (denominador)
**Antes:** `meta = totalRevenue * (aportePercentual / 100)` (15% das receitas)
**Depois:** `meta = soma de Math.abs(amount) de plannedEntries do mes atual com category === 'investimentos'`

- Usa `Math.abs(amount)` para proteger contra sinais invertidos (RESSALVA 1)
- Remove referencia a `aportePercentual` e a receitas
- Titulo muda de `"Liberdade Financeira (15%)"` para `"Liberdade Financeira"`

### 3b. Nova logica de Realizado (numerador)
**Antes:** soma de transacoes reais + planned nao conciliados + desapego vendido
**Depois:** apenas transacoes REAIS com:
- `category === 'investimentos'`
- `reconciliationStatus !== 'ja_conciliado'` (exclui duplicados)
- Nao existe campo `status === 'ignorado'` no tipo Transaction, portanto o filtro `reconciliationStatus !== 'ja_conciliado'` ja e suficiente para excluir lancamentos invalidos (RESSALVA 2 adaptada)
- Usa `Math.abs(amount)` (RESSALVA 1)

Formula: `percent = meta > 0 ? (totalRealizado / meta) * 100 : 0`

### 3c. Lista fixa de subcategorias (sempre visivel)
- Remove o `.filter((key) => (subcatTotals[key] || 0) > 0)` da linha 86
- Mapeia TODOS os 6 itens de `INVESTMENT_SUBCATEGORY_ORDER`, mostrando `R$ 0` quando vazio
- Remove o bloco condicional `{breakdown.length > 0 && ...}` - a composicao aparece SEMPRE
- Remove o bloco "sem subcategoria"

### 3d. Meta por subcategoria (orcado vs realizado)
Para cada subcategoria:
- `orcado`: `Math.abs()` dos plannedEntries do mes com essa subcategory
- `realizado`: `Math.abs()` das transacoes reais do mes com essa subcategory
- Barra de progresso: `width = min((realizado / orcado) * 100, 100)%`
- Exibicao: `Emergencia  ████░░░  R$ 200 / R$ 500`

---

## 4. Ficheiros afetados

| Ficheiro | Alteracoes |
|---|---|
| `DesktopSidebar.tsx` | 1 label |
| `BottomNav.tsx` | 1 label |
| `PlannedEntries.tsx` | 2 labels + novo painel de resumo |
| `LiberdadeFinanceira.tsx` | Refatoracao completa da logica |

## 5. Protecoes matematicas aplicadas

1. **Math.abs()** em todos os calculos de orcado e realizado
2. **Filtro rigoroso** no realizado: `reconciliationStatus !== 'ja_conciliado'` (unico filtro de exclusao disponivel no tipo Transaction)
3. **Separacao clara** receitas vs saidas no painel de orcamento

