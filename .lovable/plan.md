
# Correcao do Layout de Scroll na Revisao de Upload

## Problema
A secao de revisao de upload NAO e um Dialog/Modal. As classes `max-h-[90vh] overflow-hidden` aplicadas ao container pai estao a causar um bug visual ("Inception" de layout), restringindo indevidamente a pagina inteira.

## 3 Correcoes Exatas

### 1. Reverter o glitch no container pai (linha 605)
**De:** `className="glass-card rounded-2xl p-4 flex flex-col max-h-[90vh] overflow-hidden"`
**Para:** `className="glass-card flex flex-col rounded-2xl p-4 h-[70vh] min-h-[400px] w-full mt-4"`

Isto remove o `max-h-[90vh] overflow-hidden` que estava a cortar o layout e aplica uma altura fixa `h-[70vh]` com minimo de 400px, permitindo que o card ocupe um espaco previsivel sem vazar.

### 2. Corrigir o scroll interno da lista (linha 711)
**De:** `className="flex-1 min-h-0 overflow-y-auto border rounded-md p-2 pr-3"`
**Para:** `className="flex-1 overflow-y-auto min-h-0 mt-4 pr-2 space-y-1"`

Remove o `border rounded-md p-2 pr-3` e aplica as classes exatas solicitadas. O `space-y-1` e movido para esta div, eliminando a necessidade da div interna `<div className="space-y-1 pr-1">`.

### 3. Simplificar a div interna (linha 712)
**De:** `<div className="space-y-1 pr-1">`
**Para:** remover esta div wrapper ou simplificar para `<>` (fragment), ja que o `space-y-1` passou para a div pai no passo 2.

## Ficheiro afetado
- `src/pages/UploadPage.tsx` (3 alteracoes de className)

## Resultado esperado
- O card de revisao tera altura fixa de 70vh (minimo 400px)
- O cabecalho com botoes fica fixo no topo
- A lista de transacoes faz scroll internamente via flexbox (`flex-1 overflow-y-auto min-h-0`)
- Sem "Inception" de layout, sem Dialog falso
