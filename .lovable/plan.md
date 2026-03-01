
Objetivo imediato: corrigir o lag do File Picker no Windows com as duas mudanças exatas solicitadas (accept por extensão estrita + append/remove do input no DOM antes/depois do click), mantendo o restante do fluxo de upload intacto.

Escopo confirmado após auditoria do código:
- Arquivo afetado: `src/pages/UploadPage.tsx`
- Estado atual encontrado:
  - Já usa `document.createElement("input")`, mas:
    - ainda há `accept` não estrito para PDF (`"application/pdf"`)
    - não faz `document.body.appendChild(input)` antes de `input.click()`
    - não remove o input do DOM após seleção/cancelamento
  - Botões atuais:
    - CSV: `openNativePicker(".csv,.txt")`
    - OFX: `openNativePicker(".ofx,.qfx")`
    - PDF: `openNativePicker("application/pdf")`

Implementação planejada (sem atalhos)

1) Substituir helper genérico por 3 handlers explícitos (CSV/OFX/PDF)
- Criar funções dedicadas:
  - `handleUploadCSV`
  - `handleUploadOFX`
  - `handleUploadPDF`
- Cada função seguirá a mesma estrutura nativa exigida:
  - criar input via `document.createElement('input')`
  - `input.type = 'file'`
  - `input.accept` com extensões estritas
  - `input.style.display = 'none'`
  - `document.body.appendChild(input)` antes de `input.click()`
  - `input.onchange` processa arquivo e remove o input do DOM
  - `input.addEventListener('cancel', ...)` remove o input em cancelamento

2) Aplicar Accept estrito por extensão (sem MIME genérico)
- CSV: `input.accept = '.csv';`
- OFX: `input.accept = '.ofx,.qfx';`
- PDF: `input.accept = '.pdf';`
- Remover os accepts atuais que provocam scan mais amplo no Windows (especialmente `application/pdf` e CSV com `.txt`).

3) Garantir limpeza de memória/DOM em todos os caminhos
- Em `onchange`:
  - ler `files?.[0]`
  - se existir, chamar `processFile(file)`
  - remover input do body
- Em `cancel`:
  - remover input do body
- Implementar remoção segura para evitar erro de dupla remoção (ex.: checar `input.parentNode` antes de remover).

4) Atualizar onClick dos 3 botões de upload
- Trocar:
  - `onClick={() => openNativePicker(...)}`
- Por:
  - `onClick={handleUploadCSV}`
  - `onClick={handleUploadOFX}`
  - `onClick={handleUploadPDF}`

5) Não alterar a lógica de parsing/categorização neste ciclo
- `processFile` permanece como pipeline único de processamento.
- Não haverá alteração em `rules-engine.ts` nesta tarefa (categorização já foi validada pelo usuário).

Critérios de aceitação (QA)
1. Ao clicar em cada botão (CSV/OFX/PDF), o seletor abre sem congelamento perceptível no Windows.
2. O seletor usa filtro estrito por extensão:
   - CSV mostra `.csv`
   - OFX mostra `.ofx`/`.qfx`
   - PDF mostra `.pdf`
3. Cancelar a janela não deixa lixo no DOM (input temporário removido).
4. Selecionar arquivo continua acionando o fluxo atual de `processFile` sem regressão.
5. Drag-and-drop continua funcionando como hoje (sem alterações).

Risco técnico e mitigação
- Risco: evento `cancel` pode variar entre navegadores.
- Mitigação: manter limpeza também no `onchange` e remoção segura via checagem de `parentNode`, garantindo que o DOM não retenha elementos mesmo em caminhos alternativos.

Sequência de execução
1. Refatorar handlers de upload em `UploadPage.tsx`.
2. Atualizar binds dos 3 botões.
3. Validar estática (tipos/lint) e revisar imports/dependências do `useCallback`.
4. Validar fluxo manual em ambiente Windows (principalmente Chrome/Edge).

Observação de contexto de teste
- A sessão atual está em `/login`; para validação E2E no preview, será necessário autenticar e abrir a tela de Upload antes da verificação manual do File Picker.
