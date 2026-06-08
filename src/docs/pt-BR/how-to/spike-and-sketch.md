# Como fazer spike e sketch antes de se comprometer

**Objetivo:** Reduzir riscos de implementação por meio de experimentos de viabilidade focados (spikes) e exploração de direções visuais com maquetes HTML descartáveis (sketches) antes de se comprometer com uma fase em uma abordagem específica.

**Pré-requisitos:** Nenhum. `/ecl-spike` e `/ecl-sketch` criam seus próprios diretórios de armazenamento e não exigem um projeto eCL inicializado.

---

## Decida: spike, sketch ou ambos

| Você quer responder… | Use |
|---|---|
| "Essa abordagem técnica vai funcionar de verdade?" | `/ecl-spike` |
| "Este layout / interação / tratamento visual parece certo?" | `/ecl-sketch` |
| "Qual é a abordagem técnica correta e como ela deve parecer?" | Ambos, em ordem: spike primeiro, depois sketch |

Spikes respondem perguntas binárias de viabilidade com código executável e um veredicto VALIDATED / INVALIDATED / PARTIAL. Sketches respondem perguntas visuais com 2 a 3 variantes HTML comparáveis no navegador. Eles são complementares — um spike prova que a abordagem é construível, um sketch prova que o design vale a pena construir.

---

## Executar um spike

### Coleta interativa (padrão)

```bash
/ecl-spike
```

eCL pergunta sobre a questão técnica, a decompõe em 2 a 5 experimentos independentes estruturados como hipóteses **Given / When / Then**, e solicita confirmação antes de construir.

### Fornecer a ideia diretamente

```bash
/ecl-spike "can we stream LLM tokens through SSE"
```

### Pular a coleta e executar imediatamente

```bash
/ecl-spike --quick "websocket vs SSE latency"
```

`--quick` ignora a conversa de decomposição e trata o argumento como uma única pergunta de spike. Use isso quando a pergunta já for específica o suficiente para executar sem refinamento.

### O que cada experimento produz

Cada spike em `.planning/spikes/NNN-descriptive-name/` inclui:

- Código funcional (não pseudocódigo)
- Uma hipótese **Given / When / Then** escrita antes de qualquer código
- Um rastro de investigação documentando casos extremos, pivôs e surpresas
- Um veredicto **VALIDATED**, **INVALIDATED** ou **PARTIAL** com evidências
- Um `README.md` com frontmatter, instruções de como executar e resultados

Todos os spikes são indexados em `.planning/spikes/MANIFEST.md`.

### Empacotar os resultados

Quando você tiver um sinal, empacote os resultados em uma skill local do projeto para que sessões futuras os carreguem automaticamente:

```bash
/ecl-spike --wrap-up
```

Isso grava em `.claude/skills/spike-findings-[project]/`. A skill é descoberta automaticamente e carregada por execuções subsequentes de `/ecl-sketch`, `/ecl-ui-phase` e `/ecl-plan-phase` — você não precisa referenciá-la explicitamente.

---

## Executar um sketch

### Coleta de mood (padrão)

```bash
/ecl-sketch
```

eCL abre uma conversa breve para explorar sensação, referências visuais e a ação principal do usuário antes de qualquer código ser escrito. Faz uma pergunta por vez e só começa a construir quando você diz para ir.

### Fornecer uma direção de design diretamente

```bash
/ecl-sketch "dashboard layout"
```

### Pular a coleta de mood e executar imediatamente

```bash
/ecl-sketch --quick "sidebar navigation"
```

`--quick` ignora completamente a conversa de coleta e usa o argumento como direção de design.

### Runtimes não-Claude (Codex, Gemini CLI, etc.)

```bash
/ecl-sketch --text "onboarding flow"
```

`--text` substitui prompts interativos por listas numeradas em texto simples. Use isso quando seu runtime não suporta `AskUserQuestion`.

### O que cada sketch produz

Cada sketch em `.planning/sketches/NNN-descriptive-name/` inclui:

- `index.html` com 2 a 3 variantes acessíveis via navegação por abas — abra diretamente no navegador, sem etapa de build
- Elementos interativos funcionais (hover, clique, transições)
- Conteúdo realista usando nomes de campos e formatos de dados de qualquer resultado de spike anterior
- Variáveis CSS compartilhadas de `.planning/sketches/themes/default.css`
- Um `README.md` com a pergunta de design, variantes e o que observar

Todos os sketches são indexados em `.planning/sketches/MANIFEST.md`.

### Empacotar as decisões de design vencedoras

Após escolher uma variante, capture as decisões visuais em uma skill local do projeto:

```bash
/ecl-sketch --wrap-up
```

Isso grava em `.claude/skills/sketch-findings-[project]/`. A skill é carregada automaticamente por `/ecl-ui-phase` — decisões pré-validadas (layout, paleta de cores, tipografia, espaçamento) são tratadas como bloqueadas e não serão solicitadas novamente.

---

## Fluxo combinado: spike → sketch → fase

Esta é a sequência recomendada quando você está incerto tanto sobre a viabilidade técnica quanto sobre a direção visual:

```bash
/ecl-spike "SSE vs WebSocket for real-time feed"
/ecl-spike --wrap-up

/ecl-sketch "real-time feed UI"
/ecl-sketch --wrap-up

/ecl-discuss-phase N
/ecl-plan-phase N
```

Os resultados do spike informam o sketch (formatos de dados reais, estados de interação reais, restrições realistas). Ambos os wrap-ups persistem decisões que o planejador e o pesquisador de UI carregam automaticamente, portanto você não precisa re-explicar escolhas durante `/ecl-discuss-phase` ou `/ecl-ui-phase`.

---

## Como um spike ou sketch alimenta uma fase

Artefatos de spike e sketch não precisam ser referenciados manualmente. eCL os lê automaticamente em dois pontos:

1. **`/ecl-sketch`** — carrega `.claude/skills/spike-findings-*/` antes de construir maquetes, para que as variantes reflitam restrições comprovadas (estados de streaming, nomes de campos reais, etc.)
2. **`/ecl-ui-phase N`** — carrega `.claude/skills/sketch-findings-*/` antes de gerar o contrato de design de UI; decisões de design pré-validadas são tratadas como bloqueadas

O planejador também lê os resultados do spike quando uma skill `spike-findings-*` está presente, de modo que escolhas técnicas validadas (qual biblioteca, qual protocolo, qual formato de dados) fluem diretamente para os planos de tarefas sem explicação repetida.

---

## Relacionados

- [Projetar uma fase de UI](design-a-ui-phase.md)
- [Planejar uma fase](plan-a-phase.md)
- [Comandos](../COMMANDS.md)
- [Índice de documentação](../README.md)
