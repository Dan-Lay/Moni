

# Implementacao Completa: Upload, Categorizacao Familiar, Scroll e AwesomeAPI

## 1. Upload - 3 inputs nativos com refs separadas

**Estado actual:** Um unico `<input ref={fileRef}>` na linha 458 tem o `accept` alterado via `setAttribute` antes de cada `.click()`.

**Correcao:** Criar 3 refs independentes (`csvRef`, `ofxRef`, `pdfRef`) com 3 `<input type="file" className="hidden">` cada um com `accept` fixo. Os botoes chamam `ref.current?.click()` directamente. Remover o `fileRef` unico.

**Ficheiro:** `src/pages/UploadPage.tsx`

---

## 2. Scroll do Modal de Upload

**Estado actual:** Linha 673 usa `<div className="overflow-y-auto" style={{ maxHeight: "400px" }}>`. Funciona parcialmente.

**Correcao:** Trocar para `<div className="max-h-[50vh] overflow-y-auto block pr-2">` para garantir scroll independente em todos os tamanhos de ecra.

**Ficheiro:** `src/pages/UploadPage.tsx`

---

## 3. Renomear filtro para "Categorizado"

**Estado actual:** Linha 589 tem label "AutoTag".

**Correcao:** Trocar para "Categorizado".

**Ficheiro:** `src/pages/UploadPage.tsx`

---

## 4. Textos cortados no Extrato

**Estado actual:** Linhas 388 e 398 de Transactions.tsx usam `truncate`.

**Correcao:**
- Linha 388: `truncate min-w-0 flex-1` -> `whitespace-normal break-words min-w-[200px] flex-1`
- Linha 398: `truncate` -> `whitespace-normal break-words`

**Ficheiro:** `src/pages/Transactions.tsx`

---

## 5. Categorizacao compartilhada por familia (CRITICO)

### 5a. Migracao SQL (Supabase)
Adicionar coluna `family_id` a tabela `categorization_rules`. Recriar TODAS as politicas RLS para permitir acesso completo (SELECT, INSERT, UPDATE, DELETE) por qualquer membro da familia:

```text
ALTER TABLE categorization_rules ADD COLUMN IF NOT EXISTS family_id TEXT;
CREATE INDEX IF NOT EXISTS idx_rules_family ON categorization_rules(family_id);

-- Helper function (security definer) para buscar family_id do user logado
CREATE OR REPLACE FUNCTION public.get_user_family_id(_user_id uuid)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM profiles WHERE id = _user_id
$$;

-- Recriar politicas: TODA a familia tem acesso total
DROP POLICY IF EXISTS rules_select ON categorization_rules;
DROP POLICY IF EXISTS rules_insert ON categorization_rules;
DROP POLICY IF EXISTS rules_delete ON categorization_rules;

CREATE POLICY rules_family_select ON categorization_rules FOR SELECT USING (
  user_id = auth.uid()
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY rules_family_insert ON categorization_rules FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY rules_family_update ON categorization_rules FOR UPDATE USING (
  user_id = auth.uid()
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);

CREATE POLICY rules_family_delete ON categorization_rules FOR DELETE USING (
  user_id = auth.uid()
  OR (family_id IS NOT NULL AND family_id = public.get_user_family_id(auth.uid()))
);
```

### 5b. Rules Engine (`src/lib/rules-engine.ts`)
- Adicionar `familyId` ao interface `CategorizationRule`
- `fetchCategorizationRules(userId, familyId?)`: se `familyId` presente, buscar por `family_id` (via `.or()`) para trazer regras de toda a familia
- `createCategorizationRule(...)`: aceitar `familyId` e persistir na coluna `family_id`
- Nova funcao `upsertCategorizationRule(keyword, category, profile, userId, familyId)`: faz upsert baseado em `keyword + family_id` para evitar duplicados

### 5c. UploadPage - Aprendizado no Upload
Na funcao `handleConfirmImport`, apos inserir transacoes com sucesso, iterar as `reviewRows` que tiveram categoria alterada manualmente (comparar com a categoria original do categorizer). Para cada alteracao, chamar `upsertCategorizationRule` com `user.familyId`.

### 5d. UploadPage - Fetch de regras com familyId
Alterar o `useEffect` da linha 131-135 para passar `user.familyId` ao `fetchCategorizationRules`.

### 5e. Transactions.tsx - Aprendizado no Extrato
Na funcao `confirmEdit`, apos salvar alteracao de categoria com sucesso, chamar `upsertCategorizationRule` com:
- `keyword`: establishment ou primeiros 30 chars da descricao limpa
- `category`: nova categoria
- `profile`: perfil do spouse
- `familyId`: `user.familyId`

---

## 6. Widget Dollar/Euro - AwesomeAPI

**Estado actual:** Usa `api.frankfurter.app` (linha 18-19 de DollarDisney.tsx).

**Correcao:** Trocar URL para `https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL`. Parse: `json.USDBRL.bid` e `json.EURBRL.bid` (strings -> parseFloat). Sem token na URL (endpoint gratuito).

**Ficheiro:** `src/components/dashboard/DollarDisney.tsx`

---

## Resumo de ficheiros afetados

| Ficheiro | Alteracoes |
|---|---|
| `src/pages/UploadPage.tsx` | 3 refs nativas, scroll `max-h-[50vh]`, renomear filtro, aprendizado no confirm |
| `src/pages/Transactions.tsx` | Remover truncate, aprendizado no confirmEdit |
| `src/lib/rules-engine.ts` | family_id em fetch/create, nova funcao upsert |
| `src/components/dashboard/DollarDisney.tsx` | AwesomeAPI |
| Migracao Supabase | Coluna family_id, funcao helper, 4 politicas RLS (SELECT/INSERT/UPDATE/DELETE) |

