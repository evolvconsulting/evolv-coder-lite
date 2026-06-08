# Guia do Usuário eCL

Um guia narrativo complementar ao eCL Core — comece aqui para se orientar e siga os links para a documentação dedicada.

> **A documentação do eCL Core é organizada seguindo o modelo [Diataxis](https://diataxis.fr).**
> Navegue por objetivo: [Tutoriais](README.md#tutorials) · [Guias práticos](README.md#how-to-guides) · [Referência](README.md#reference) · [Explicação](README.md#explanation) · [Índice da documentação](README.md)

---

## Sumário

- [Formas do slash-command](#formas-do-slash-command-hífen-vs-dois-pontos)
- [Introdução ao roteamento de namespace](#introdução-ao-roteamento-de-namespace-gsdnamespace-v140)
- [Visão geral do ciclo de vida do projeto](#visão-geral-do-ciclo-de-vida-do-projeto)
- [Diagramas de fluxo](#diagramas-de-fluxo)
- [Contrato de design de UI](#contrato-de-design-de-ui)
- [Spikes e Esboços](#spikes-e-esboços)
- [Backlog e Threads](#backlog-e-threads)
- [Workstreams e Workspaces](#workstreams-e-workspaces)
- [Segurança](#segurança)
- [Exemplos de uso](#exemplos-de-uso)
- [Solução de problemas](#solução-de-problemas)
- [Referência rápida de recuperação](#referência-rápida-de-recuperação)
- [Estrutura de arquivos do projeto](#estrutura-de-arquivos-do-projeto)
- [Relacionados](#relacionados)

Para conduzir o eCL diretamente a partir de uma issue do GitHub / Linear / Jira, consulte o guia
[Orquestração orientada por issues](issue-driven-orchestration.md) — uma
receita que mapeia issues do rastreador ao ciclo workspace → discuss → plan →
execute → verify → review → ship usando as primitivas eCL existentes.

---

## Formas do slash-command (hífen vs dois-pontos)

O eCL fornece **o mesmo conjunto de habilidades** para todos os runtimes suportados, mas dois estilos de barra são utilizados:

- **Forma com hífen** — `/ecl-command-name` — usada por Claude Code, Copilot, OpenCode, Kilo, Cursor, Windsurf, Augment, Antigravity e Trae.
- **Forma com dois-pontos** — `/ecl:command-name` — usada **exclusivamente pelo Gemini CLI**. O Gemini coloca todos os comandos de cada plugin sob o ID do plugin, portanto o instalador reescreve todas as referências no corpo do texto e nos arquivos de comando para a forma com dois-pontos durante a instalação com `--gemini`.

Você não precisa escolher — o instalador grava a forma correta no diretório de comandos de cada runtime que você especificar. Ao seguir um guia passo a passo num terminal Gemini, substitua o hífen após `ecl` por dois-pontos ao ler cada slash-command.

## Introdução ao roteamento de namespace (`ecl:<namespace>`, v1.40)

A v1.40 traz seis **meta-habilidades de namespace** como pontos de entrada de primeiro estágio para roteamento hierárquico — elas mantêm baixo o custo de tokens da listagem antecipada de habilidades (~120 tokens para 6 roteadores versus ~2.150 para uma listagem plana de 86 habilidades), enquanto cada sub-habilidade concreta permanece diretamente invocável. O corpo de cada roteador de namespace contém uma tabela de roteamento que mapeia sua intenção à sub-habilidade concreta correta.

| Namespace | Roteador | Encaminha para |
|-----------|--------|-----------|
| Pipeline de fases | `/ecl-workflow` | discuss / plan / execute / verify / phase / progress |
| Ciclo de vida do projeto | `/ecl-project` | milestones, audits, summary |
| Gates de qualidade | `/ecl-quality` | code review, debug, audit, security, eval, ui |
| Inteligência de codebase | `/ecl-context` | map, graphify, docs, learnings |
| Gerenciamento | `/ecl-manage` | config, workspace, workstreams, thread, update, ship, inbox |
| Exploração e captura | `/ecl-ideate` | explore, sketch, spike, spec, capture |

Você quase nunca precisa digitar um roteador de namespace diretamente. Seu valor está na camada de roteamento que o modelo usa para descobrir a sub-habilidade correta — eles existem para que o prompt do sistema possa listar 6 entradas em vez de 86. Se você já conhece o comando concreto (ex.: `/ecl-plan-phase`), invoque-o diretamente.

---

## Visão geral do ciclo de vida do projeto

O ciclo central do eCL é: **discuss → plan → execute → verify → ship**, repetido por fase. O guia passo a passo completo — incluindo exemplos de saída, quais arquivos são criados e todas as flags em uso — está no tutorial dedicado.

Consulte [Seu primeiro projeto](tutorials/your-first-project.md).

Para integrar uma base de código existente antes de iniciar um novo milestone, consulte [Integrando uma base de código existente](tutorials/onboarding-an-existing-codebase.md).

**Flags relevantes em resumo:**

| Flag | Comando | Quando usar |
| ---- | ------- | ----------- |
| `--auto` | `/ecl-new-project` | Pular perguntas interativas, ingerir de um arquivo PRD |
| `--research` | `/ecl-quick` | Adicionar um agente de pesquisa a uma tarefa avulsa |
| `--validate` | `/ecl-quick` | Adicionar verificação de plano e verificação pós-execução |
| `--chain` | `/ecl-discuss-phase` | Encadear automaticamente discuss → plan → execute sem pausas |
| `--skip-research` | `/ecl-plan-phase` | Pular agentes de pesquisa quando o domínio já é familiar |
| `--draft` | `/ecl-ship` | Criar um PR como rascunho em vez de pronto para revisão |

Para a referência completa de comandos com todas as flags, consulte [`docs/COMMANDS.md`](COMMANDS.md). Para opções de configuração (perfis de modelo, agentes de workflow, branching git), consulte [`docs/CONFIGURATION.md`](CONFIGURATION.md).

---

## Diagramas de fluxo

### Ciclo de vida completo do projeto

```text
  ┌──────────────────────────────────────────────────┐
  │                   NEW PROJECT                    │
  │  /ecl-new-project                                │
  │  Questions -> Research -> Requirements -> Roadmap│
  └─────────────────────────┬────────────────────────┘
                            │
             ┌──────────────▼─────────────┐
             │      FOR EACH PHASE:       │
             │                            │
             │  ┌────────────────────┐    │
             │  │ /ecl-discuss-phase │    │  <- Lock in preferences
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /ecl-ui-phase      │    │  <- Design contract (frontend)
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /ecl-plan-phase    │    │  <- Research + Plan + Verify
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /ecl-execute-phase │    │  <- Parallel execution
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /ecl-verify-work   │    │  <- Manual UAT
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /ecl-ship          │    │  <- Create PR (optional)
             │  └──────────┬─────────┘    │
             │             │              │
             │     Next Phase?────────────┘
             │             │ No
             └─────────────┼──────────────┘
                            │
            ┌───────────────▼──────────────┐
            │  /ecl-audit-milestone        │
            │  /ecl-complete-milestone     │
            └───────────────┬──────────────┘
                            │
                   Another milestone?
                       │          │
                      Yes         No -> Done!
                       │
               ┌───────▼──────────────┐
               │  /ecl-new-milestone  │
               └──────────────────────┘
```

### Coordenação de agentes de planejamento

```text
  /ecl-plan-phase N
         │
         ├── Phase Researcher (x4 parallel)
         │     ├── Stack researcher
         │     ├── Features researcher
         │     ├── Architecture researcher
         │     └── Pitfalls researcher
         │           │
         │     ┌──────▼──────┐
         │     │ RESEARCH.md │
         │     └──────┬──────┘
         │            │
         │     ┌──────▼──────┐
         │     │   Planner   │  <- Reads PROJECT.md, REQUIREMENTS.md,
         │     │             │     CONTEXT.md, RESEARCH.md
         │     └──────┬──────┘
         │            │
         │     ┌──────▼───────────┐     ┌────────┐
         │     │   Plan Checker   │────>│ PASS?  │
         │     └──────────────────┘     └───┬────┘
         │                                  │
         │                             Yes  │  No
         │                              │   │   │
         │                              │   └───┘  (loop, up to 3x)
         │                              │
         │                        ┌─────▼──────┐
         │                        │ PLAN files │
         │                        └────────────┘
         └── Done
```

### Arquitetura de validação (Camada Nyquist)

Durante a pesquisa da fase de planejamento, o eCL mapeia a cobertura de testes automatizados para cada requisito da fase antes que qualquer código seja escrito. O pesquisador detecta sua infraestrutura de testes existente, mapeia cada requisito para um comando de teste específico e identifica qualquer scaffolding de testes que deve ser criado antes do início da implementação (tarefas da Wave 0). O verificador de planos impõe isso como uma 8ª dimensão de verificação: planos em que as tarefas carecem de comandos de verificação automatizados não serão aprovados.

**Saída:** `{phase}-VALIDATION.md` — o contrato de feedback para a fase.

**Desativar:** Defina `workflow.nyquist_validation: false` em `/ecl-settings` para fases de prototipagem rápida onde a infraestrutura de testes não é o foco.

### Validação retroativa (`/ecl-validate-phase`)

Para fases executadas antes de a validação Nyquist existir, ou para bases de código existentes com apenas suítes de teste tradicionais, audite retroativamente e preencha as lacunas de cobertura:

```text
  /ecl-validate-phase N
         |
         +-- Detect state (VALIDATION.md exists? SUMMARY.md exists?)
         |
         +-- Discover: scan implementation, map requirements to tests
         |
         +-- Analyze gaps: which requirements lack automated verification?
         |
         +-- Present gap plan for approval
         |
         +-- Spawn auditor: generate tests, run, debug (max 3 attempts)
         |
         +-- Update VALIDATION.md
               |
               +-- COMPLIANT -> all requirements have automated checks
               +-- PARTIAL -> some gaps escalated to manual-only
```

O auditor nunca modifica o código de implementação — apenas arquivos de teste e VALIDATION.md. Se um teste revelar um bug de implementação, ele é sinalizado como escalonamento para que você o resolva.

### Modo de discussão por suposições

Por padrão, `/ecl-discuss-phase` faz perguntas abertas sobre suas preferências de implementação. O modo de suposições inverte isso: o eCL lê sua base de código primeiro, levanta suposições estruturadas sobre como construiria a fase e solicita apenas correções.

**Ativar:** Defina `workflow.discuss_mode` como `'assumptions'` via `/ecl-settings`.

Consulte [docs/workflow-discuss-mode.md](workflow-discuss-mode.md) para a referência completa do modo discuss.

### Gates de cobertura de decisões

A fase de discussão captura decisões de implementação no CONTEXT.md sob um bloco `<decisions>` como marcadores numerados (`- **D-01:** …`). Dois gates garantem que essas decisões sobrevivam até os planos e o código entregue.

**Gate de tradução na fase de planejamento (bloqueante).** Após o planejamento, o eCL se recusa a marcar a fase como planejada até que cada decisão rastreável apareça em pelo menos um `must_haves`, `truths` ou corpo de um plano.

**Gate de validação na fase de verificação (não bloqueante).** Durante a verificação, o eCL pesquisa planos, SUMMARY.md, arquivos modificados e mensagens de commit recentes para cada decisão rastreável. Ausências são registradas no VERIFICATION.md como uma seção de aviso; o status de verificação permanece inalterado.

**Excluir uma decisão dos gates.** Mova-a para o cabeçalho `### Claude's Discretion` dentro de `<decisions>`, ou marque-a: `- **D-08 [informational]:** …`, `- **D-09 [folded]:** …`, `- **D-10 [deferred]:** …`.

**Desativar os gates.** Defina `workflow.context_coverage_gate: false` em `.planning/config.json` (ou via `/ecl-settings`). O padrão é `true`.

### Coordenação de waves de execução

```text
  /ecl-execute-phase N
         │
         ├── Analyze plan dependencies
         │
         ├── Wave 1 (independent plans):
         │     ├── Executor A (fresh 200K context) -> commit
         │     └── Executor B (fresh 200K context) -> commit
         │
         ├── Wave 2 (depends on Wave 1):
         │     └── Executor C (fresh 200K context) -> commit
         │
         └── Verifier
               ├── Check codebase against phase goals
               ├── Test quality audit (disabled tests, circular patterns, assertion strength)
               │
               ├── PASS -> VERIFICATION.md (success)
               └── FAIL -> Issues logged for /ecl-verify-work
```

---

## Contrato de design de UI

Frontends gerados por IA são visualmente inconsistentes não porque o Claude Code seja ruim em UI, mas porque não existia um contrato de design antes da execução. `/ecl-ui-phase` bloqueia o contrato de design antes do planejamento; `/ecl-ui-review` audita o resultado após a execução.

Para o fluxo completo, configuração, inicialização do shadcn e o gate de segurança do registry, consulte [Projetar uma fase de UI](how-to/design-a-ui-phase.md).

**Referência rápida:**

| Comando              | Descrição                                                     |
| -------------------- | ------------------------------------------------------------- |
| `/ecl-ui-phase [N]`  | Gerar contrato de design UI-SPEC.md para uma fase de frontend |
| `/ecl-ui-review [N]` | Auditoria visual retroativa em 6 pilares da UI implementada   |

| Configuração              | Padrão | Descrição                                                                     |
| ------------------------- | ------- | ----------------------------------------------------------------------------- |
| `workflow.ui_phase`       | `true`  | Gerar contratos de design de UI para fases de frontend                        |
| `workflow.ui_safety_gate` | `true`  | A fase de planejamento solicita executar /ecl-ui-phase para fases de frontend |

---

## Spikes e Esboços

Use `/ecl-spike` para validar a viabilidade técnica antes do planejamento e `/ecl-sketch` para explorar a direção visual antes de projetar. Ambos armazenam artefatos em `.planning/` e se integram ao sistema de habilidades do projeto por meio de seus companions de encerramento.

Para o fluxo completo e o diagrama de fluxo, consulte [Spike e esboço](how-to/spike-and-sketch.md).

**Fluxo típico:**

```bash
/ecl-spike "SSE vs WebSocket"     # Validate the approach
/ecl-spike --wrap-up              # Package learnings

/ecl-sketch "real-time feed UI"   # Explore the design
/ecl-sketch --wrap-up             # Package decisions

/ecl-discuss-phase N              # Lock in preferences (now informed by spike + sketch)
/ecl-plan-phase N                 # Plan with confidence
```

---

## Backlog e Threads

### Estacionamento de backlog

Ideias que ainda não estão prontas para planejamento ativo vão para o backlog usando a numeração 999.x, mantendo-as fora da sequência de fases ativas.

```bash
/ecl-capture --backlog "GraphQL API layer"     # Creates 999.1-graphql-api-layer/
/ecl-capture --backlog "Mobile responsive"     # Creates 999.2-mobile-responsive/
```

Os itens de backlog recebem diretórios de fase completos, portanto você pode usar `/ecl-discuss-phase 999.1` para explorar uma ideia mais a fundo ou `/ecl-plan-phase 999.1` quando ela estiver pronta.

**Revisar e promover** com `/ecl-review-backlog` — ele exibe todos os itens do backlog e permite promovê-los (mover para a sequência ativa), mantê-los (deixar no backlog) ou removê-los (excluir).

### Seeds

Seeds são ideias voltadas para o futuro com condições de acionamento. Ao contrário dos itens de backlog, as seeds aparecem automaticamente quando o milestone certo chega.

```bash
/ecl-capture --seed "Add real-time collab when WebSocket infra is in place"
```

`/ecl-new-milestone` verifica todas as seeds e apresenta correspondências. **Armazenamento:** `.planning/seeds/SEED-NNN-slug.md`

### Threads de contexto persistentes

Threads são armazenamentos de conhecimento leves entre sessões para trabalhos que abrangem múltiplas sessões mas não pertencem a nenhuma fase específica.

```bash
/ecl-thread                              # List all threads
/ecl-thread fix-deploy-key-auth          # Resume existing thread
/ecl-thread "Investigate TCP timeout"    # Create new thread
```

As threads podem ser promovidas a fases (`/ecl-phase`) ou itens de backlog (`/ecl-capture --backlog`) quando amadurecerem. **Armazenamento:** `.planning/threads/{slug}.md`

---

## Workstreams e Workspaces

Workstreams e workspaces fornecem isolamento, mas em níveis diferentes.

**Workstreams** compartilham a mesma base de código e histórico git, mas isolam artefatos de planejamento — mais leves, bons para trabalhar em múltiplas áreas de milestone simultaneamente. Consulte [Trabalhar em paralelo com workstreams](how-to/work-in-parallel-with-workstreams.md).

**Workspaces** criam worktrees de repositório separados com seus próprios `.planning/` — mais pesados, para isolamento de feature branch ou multi-repositório. Consulte [Isolar trabalho com workspaces](how-to/isolate-work-with-workspaces.md).

| Comando                            | Propósito                                                     |
| ---------------------------------- | ------------------------------------------------------------- |
| `/ecl-workstreams create <name>`   | Criar um novo workstream com estado de planejamento isolado   |
| `/ecl-workstreams switch <name>`   | Alternar contexto ativo para um workstream diferente          |
| `/ecl-workstreams list`            | Exibir todos os workstreams e qual está ativo                 |
| `/ecl-workstreams complete <name>` | Marcar um workstream como concluído e arquivar seu estado     |

```bash
# Workspace example — feature branch isolation
/ecl-workspace --new --name feature-b --repos .
cd ~/ecl-workspaces/feature-b
/ecl-new-project

/ecl-workspace --list
/ecl-workspace --remove feature-b
```

---

## Segurança

### Defesa em profundidade (v1.27)

O eCL gera arquivos markdown que se tornam prompts de sistema de LLM. Isso significa que qualquer texto controlado pelo usuário que flua para artefatos de planejamento é um vetor potencial de injeção indireta de prompt. A v1.27 introduziu endurecimento centralizado de segurança:

**Prevenção de Path Traversal:** Todos os caminhos de arquivo fornecidos pelo usuário (`--text-file`, `--prd`) são validados para resolver dentro do diretório do projeto. A resolução de symlinks macOS `/var` → `/private/var` é tratada.

**Detecção de Injeção de Prompt:** O módulo `security.cjs` verifica padrões de injeção conhecidos no texto fornecido pelo usuário antes de entrar nos artefatos de planejamento.

**Hooks de runtime:**

- `ecl-prompt-guard.js` — Verifica chamadas Write/Edit para `.planning/` em busca de padrões de injeção (sempre ativo, somente consultivo)
- `ecl-workflow-guard.js` — Avisa sobre edições de arquivos fora do contexto do workflow eCL (opt-in via `hooks.workflow_guard`)

**Scanner de CI:** `prompt-injection-scan.test.cjs` verifica todos os arquivos de agentes, workflows e comandos em busca de vetores de injeção incorporados.

---

### Gate de legitimidade de pacotes (v1.42.1)

Ferramentas de codificação com IA alucinam nomes de pacotes. Atacantes pré-registram esses nomes no npm, PyPI e crates.io com scripts maliciosos de pós-instalação — uma técnica chamada *slopsquatting*. A v1.42.1 adiciona um gate de três camadas que interrompe isso antes de chegar ao seu shell.

**No RESEARCH.md** — cada fase que recomenda pacotes externos inclui uma tabela `## Package Legitimacy Audit`:

```markdown
## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| express | npm | 13 yrs | 100M+/wk | github.com/expressjs/express | [OK] | Approved |
| some-new-util | npm | 3 days | 47 | none | [SLOP] | REMOVED |
| api-bridge | npm | 6 mo | 1.2k/wk | github.com/user/api-bridge | [SUS] | Flagged |
```

Pacotes com `[SLOP]` são removidos do RESEARCH.md inteiramente e nunca chegam ao planejador.

**No PLAN.md** — pacotes com `[SUS]` ou `[ASSUMED]` acionam uma tarefa `checkpoint:human-verify` antes da instalação.

**Durante a execução** — se uma instalação falhar, o executor apresenta um checkpoint e para em vez de tentar silenciosamente uma alternativa.

**Veredictos do slopcheck:**

| Veredicto | Significado | Ação do eCL |
|---------|---------|------------|
| `[OK]` | Passa em todas as verificações de legitimidade | Prossegue — nenhum checkpoint adicionado |
| `[SUS]` | Sinais suspeitos | Sinalizado; o planejador adiciona `checkpoint:human-verify` |
| `[SLOP]` | Alucinação de alta confiança | Removido do RESEARCH.md; nunca chega ao planejador |

Para instalar o slopcheck manualmente:

```bash
pip install slopcheck
# verify: slopcheck install express --json
```

---

## Workflow de revisão de código

Após executar uma fase, execute uma revisão de código estruturada antes do UAT. Consulte [Configurar revisão cross-AI](how-to/set-up-cross-ai-review.md) para o fluxo completo.

```bash
/ecl-code-review 3               # Review all changed files in phase 3
/ecl-code-review 3 --depth=deep  # Deep cross-file review
/ecl-code-review 3 --fix         # Fix Critical + Warning findings atomically
/ecl-code-review 3 --fix --auto  # Fix and re-review until clean (max 3 iterations)
/ecl-audit-fix                   # Audit + classify + fix (medium+ severity, max 5)
```

A etapa de revisão se encaixa após a execução e antes do UAT:

```text
/ecl-execute-phase N  ->  /ecl-code-review N  ->  /ecl-code-review N --fix  ->  /ecl-verify-work N
```

---

## Referência de comandos e configuração

- **Referência de comandos:** consulte [`docs/COMMANDS.md`](COMMANDS.md) para flags, subcomandos e exemplos de cada comando estável.
- **Referência de configuração:** consulte [`docs/CONFIGURATION.md`](CONFIGURATION.md) para o esquema completo do `config.json`, tabela de perfis de modelo, estratégias de branching git e configurações de segurança.
- **Modo Discuss:** consulte [`docs/workflow-discuss-mode.md`](workflow-discuss-mode.md) para o modo entrevista vs suposições.

---

## Exemplos de uso

### Novo projeto (ciclo completo)

```bash
claude --dangerously-skip-permissions
/ecl-new-project            # Answer questions, configure, approve roadmap
/clear
/ecl-discuss-phase 1        # Lock in your preferences
/ecl-ui-phase 1             # Design contract (frontend phases)
/ecl-plan-phase 1           # Research + plan + verify
/ecl-execute-phase 1        # Parallel execution
/ecl-verify-work 1          # Manual UAT
/ecl-ship 1                 # Create PR from verified work
/ecl-ui-review 1            # Visual audit (frontend phases)
/clear
/ecl-progress --next                   # Auto-detect and run next step
...
/ecl-audit-milestone        # Check everything shipped
/ecl-complete-milestone     # Archive, tag, done
/ecl-pause-work --report         # Generate session summary
```

### Novo projeto a partir de um documento existente

```bash
/ecl-new-project --auto @prd.md   # Auto-runs research/requirements/roadmap from your doc
/clear
/ecl-discuss-phase 1               # Normal flow from here
```

### Base de código existente

```bash
/ecl-map-codebase           # Analyse what exists (parallel agents)
/ecl-new-project            # Questions focus on what you're ADDING
# (normal phase workflow from here)
```

**Detecção de drift pós-execução (#2003).** Após cada `/ecl-execute-phase`, o eCL verifica se a fase introduziu mudanças estruturais suficientes para tornar `.planning/codebase/STRUCTURE.md` desatualizado. Altere o comportamento com:

```bash
/ecl-settings workflow.drift_action auto-remap       # remap automatically
/ecl-settings workflow.drift_threshold 5             # tune sensitivity
```

### Proteção contra drift de plano

**Ativada por padrão.** O protetor de drift de plano (`plan_review.source_grounding: true`) é executado durante a revisão do plano e verifica se cada símbolo citado nos seus planos — decorators, classes, funções, flags CLI — realmente existe na sua árvore de código-fonte no momento da revisão. Isso detecta nomes alucinados antes que qualquer agente de execução seja executado.

**O que detecta:**

- Funções referenciadas em uma etapa de PLAN.md que não existem no código-fonte
- Nomes de classes ou decorators que foram renomeados ou removidos desde que o plano foi escrito
- Flags CLI documentadas em um plano que não estão definidas no analisador de argumentos
- Caminhos de módulo citados em etapas de implementação que não resolvem para nenhum arquivo

**Comportamento de needs-acknowledgement.** Quando o protetor encontra um símbolo ausente, ele emite um aviso de needs-acknowledgement na saída da revisão do plano em vez de bloquear permanentemente. Você pode reconhecer e prosseguir (o símbolo pode ser intencionalmente novo) ou solicitar uma revisão do plano. O protetor não rejeita planos automaticamente — ele apresenta sinais para decisão humana.

**Funciona sem intel.** Por padrão, o protetor usa `grep`/`ripgrep` para pesquisar arquivos de código-fonte — não requer pré-indexação. Se você executou `/ecl:map-codebase` com `intel.enabled: true`, defina `plan_review.source_grounding_authority: intel` para usar o índice pré-construído `api-map.json` mais rápido.

```bash
# Enable/disable (default: on)
/ecl-settings plan_review.source_grounding true
/ecl-settings plan_review.source_grounding false

# Switch resolver authority
/ecl-settings plan_review.source_grounding_authority grep   # live grep (default)
/ecl-settings plan_review.source_grounding_authority intel  # pre-indexed api-map.json
```

Alterne na configuração do projeto (`/ecl:new-project` pergunta durante as preferências de workflow) ou a qualquer momento via `/ecl:settings` (seção Planning → Drift Guard).

### Correção rápida de bug

```bash
/ecl-quick
> "Fix the login button not responding on mobile Safari"
```

### Retomando após uma pausa

```bash
/ecl-progress               # See where you left off and what's next
# or
/ecl-resume-work            # Full context restoration from last session
```

### Preparando para um release

```bash
/ecl-audit-milestone        # Check requirements coverage, detect stubs
/ecl-complete-milestone     # Archive, tag, done
```

### Predefinições de velocidade vs qualidade

| Cenário               | Modo          | Granularidade | Perfil     | Pesquisa | Verificação de plano | Verificador |
| --------------------- | ------------- | ------------- | ---------- | -------- | -------------------- | ----------- |
| Prototipagem          | `yolo`        | `coarse`      | `budget`   | off      | off                  | off         |
| Desenvolvimento normal | `interactive` | `standard`    | `balanced` | on       | on                   | on          |
| Produção              | `interactive` | `fine`        | `quality`  | on       | on                   | on          |

**Pulando a fase discuss no modo autônomo:** Ao executar no modo `yolo`, defina `workflow.skip_discuss: true` via `/ecl-settings`.

### Mudanças de escopo no meio do milestone

```bash
/ecl-phase                  # Append a new phase to the roadmap (default mode)
/ecl-phase --insert 3       # Insert urgent work between phases 3 and 4
/ecl-phase --remove 7       # Descope phase 7 and renumber
/ecl-phase --edit 4         # Edit any field of phase 4 in place
```

---

## Solução de problemas

Para um guia abrangente de solução de problemas, consulte [Recuperar e solucionar problemas](how-to/recover-and-troubleshoot.md). Os problemas mais comuns estão resumidos abaixo.

### CLI programática (`ecl-tools query` vs `ecl-tools.cjs`)

Para automação, prefira **`ecl-tools query`** com um subcomando registrado (consulte [CLI-TOOLS.md — SDK e acesso programático](CLI-TOOLS.md#sdk-and-programmatic-access) e QUERY-HANDLERS.md). O CLI legado `node $HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs` continua sendo suportado.

### STATE.md fora de sincronia

```bash
node "$HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs" state validate          # Detect drift
node "$HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs" state sync --verify     # Preview changes
node "$HOME/.claude/evolv-coder-lite/bin/ecl-tools.cjs" state sync              # Reconstruct STATE.md
```

### Um comando parece congelado após "Spawning..."

Os subagentes do eCL rodam em uma janela de contexto separada — seu trabalho fica invisível para a sessão pai enquanto está em andamento. Não interrompa a sessão. Aguarde o resultado; agentes de pesquisa e planejamento rotineiramente levam de 1 a 5 minutos.

### Degradação de contexto durante sessões longas

Limpe sua janela de contexto entre os principais comandos: `/clear` no Claude Code. O eCL foi projetado em torno de contextos frescos — cada subagente recebe uma janela limpa de 200K. Use `/ecl-resume-work` ou `/ecl-progress` para restaurar o estado após limpar.

### Planos parecem errados ou desalinhados

Execute `/ecl-discuss-phase [N]` antes do planejamento. A maioria dos problemas de qualidade de plano ocorre porque o Claude faz suposições que o `CONTEXT.md` teria prevenido.

### A execução falha ou produz stubs

Verifique se o plano não era ambicioso demais. Os planos devem ter no máximo 2 a 3 tarefas. Replaneje com um escopo menor.

### Perdeu o controle de onde está

Execute `/ecl-progress`. Ele lê todos os arquivos de estado e informa exatamente onde você está e o que fazer a seguir.

### Custos de modelo muito altos

Mude para o perfil budget: `/ecl-config --profile budget`. Desative os agentes de pesquisa e verificação de plano via `/ecl-settings` se o domínio for familiar.

### Ajuste de custo de modelo por fase (`models`) — adicionado na v1.40

Adicione um bloco `models` ao `.planning/config.json`:

```json
{
  "model_profile": "balanced",
  "models": {
    "planning": "opus",
    "discuss": "opus",
    "research": "sonnet",
    "execution": "opus",
    "verification": "sonnet",
    "completion": "sonnet"
  }
}
```

Precisa de uma exceção por agente? Adicione `model_overrides` junto — ele prevalece sobre `models`:

```json
{
  "models": { "research": "sonnet" },
  "model_overrides": {
    "ecl-codebase-mapper": "haiku"
  }
}
```

Para a tabela de mapeamento completa e as regras de precedência de resolução, consulte [Modelos por tipo de fase](CONFIGURATION.md#per-phase-type-models-models--added-in-v140).

### Barato por padrão com `dynamic_routing` — adicionado na v1.40

```json
{
  "dynamic_routing": {
    "enabled": true,
    "tier_models": {
      "light":    "haiku",
      "standard": "sonnet",
      "heavy":    "opus"
    },
    "escalate_on_failure": true,
    "max_escalations": 1
  }
}
```

Para o mapeamento completo de agente → tier, consulte [Roteamento dinâmico](CONFIGURATION.md#dynamic-routing-with-failure-tier-escalation-dynamic_routing--added-in-v140).

### Reduza servidores MCP para diminuir o custo por turno

Antes de ajustar `model_profile` ou `models.<phase_type>`, audite quais **servidores MCP** seu harness tem habilitados. Cada servidor MCP habilitado injeta seu esquema de ferramentas em cada turno — servidores pesados podem custar mais de 20k tokens cada.

Esta é uma **configuração do harness**, não do eCL. O toggle fica em `.claude/settings.json`:

```json
{
  "enabledMcpjsonServers": ["context7"],
  "disabledMcpjsonServers": ["playwright", "mac-tools"]
}
```

Auditoria rápida antes de uma fase longa:

- Alguma ferramenta de browser/playwright está habilitada quando esta fase não tem trabalho de UI?
- Alguma ferramenta específica de plataforma está habilitada quando não é necessária?
- Algum MCP específico de projeto de outro projeto ainda está habilitado aqui?

Cada servidor desabilitado remove seu esquema de cada turno subsequente. Reduzir MCPs **compõe** com o ajuste de `model_profile` — ambas as alavancas são aditivas, e as economias de MCP aparecem imediatamente em cada subagente que o orquestrador gera.

Para a auditoria completa, referência do harness e a nota de composição com `model_profile`, consulte [Custo de esquema de ferramentas MCP](../../evolv-coder-lite/references/context-budget.md#mcp-tool-schema-cost-harness-concern) na referência `context-budget.md` incluída.

### Usando runtimes não-Claude (Codex, OpenCode, Gemini CLI, Kilo)

> **Versão mínima suportada do Codex CLI: `0.130.0`** (issue [#3562](https://github.com/evolvconsulting/evolv-coder-lite/issues/3562)).

Se você instalou o eCL para um runtime não-Claude, o instalador já configurou a resolução de modelo. Nenhuma configuração manual é necessária — `resolve_model_ids: "omit"` é definido automaticamente, o que informa ao eCL para pular a resolução de ID de modelo Anthropic e deixar o runtime escolher seu próprio modelo padrão.

Para atribuir diferentes modelos em um runtime não-Claude:

```json
{
  "resolve_model_ids": "omit",
  "model_overrides": {
    "ecl-planner": "o3",
    "ecl-executor": "o4-mini",
    "ecl-debugger": "o3"
  }
}
```

#### Mudando de Claude para Codex com uma alteração de configuração (#2517)

```json
{
  "runtime": "codex",
  "model_profile": "balanced"
}
```

Consulte [Perfis cientes de runtime](CONFIGURATION.md#runtime-aware-profiles-2517).

### Instalação manual / configuração sem Node.js

Se você não puder executar o instalador do eCL, não poderá usar os arquivos de origem em `agents/` diretamente — eles estão no formato nativo de frontmatter do Claude Code. Para o OpenCode, são necessárias duas transformações:

| Campo | Formato fonte eCL | Formato válido para OpenCode | Ação |
|---|---|---|---|
| `tools:` | `Read, Bash, Grep` (string com vírgula) | Não é um campo frontmatter | Remover a linha `tools:` inteiramente |
| `color:` | Nome de cor CSS simples | Nome hex ou semântico OpenCode | Converter para hex ou remover |

**Alternativa:** execute o instalador em qualquer máquina com Node.js:

```bash
npx @evolvconsulting/evolv-coder-lite@latest --opencode --global
```

### Instalando para o Cline

```bash
npx @evolvconsulting/evolv-coder-lite --cline --global   # applies to all projects
npx @evolvconsulting/evolv-coder-lite --cline --local    # this project only
```

### Instalando para o CodeBuddy

```bash
npx @evolvconsulting/evolv-coder-lite --codebuddy --global
```

### Instalando para o Qwen Code

```bash
npx @evolvconsulting/evolv-coder-lite --qwen --global
```

### Instalando para edições de pré-lançamento

Defina a variável de ambiente `*_CONFIG_DIR` do runtime para o diretório de pré-lançamento antes de executar o instalador:

```bash
WINDSURF_CONFIG_DIR=~/.codeium/windsurf-next npx @evolvconsulting/evolv-coder-lite@latest --windsurf --global
```

**Referência de variáveis de ambiente para runtimes suportados:**

| Runtime | Padrão estável | Variável de ambiente para substituição |
|---|---|---|
| Claude Code | `~/.claude` | `CLAUDE_CONFIG_DIR` |
| Gemini CLI | `~/.gemini` | `GEMINI_CONFIG_DIR` |
| OpenCode | `XDG_CONFIG_HOME/opencode` | `OPENCODE_CONFIG_DIR` |
| Codex | (per Codex CLI) | `--config-dir` flag |
| Copilot | `~/.copilot` | `COPILOT_CONFIG_DIR` |
| Cursor | `~/.cursor` | `CURSOR_CONFIG_DIR` |
| Windsurf | `~/.codeium/windsurf` | `WINDSURF_CONFIG_DIR` |
| Antigravity | auto-detected | `ANTIGRAVITY_CONFIG_DIR` |
| Augment | `~/.augment` | `AUGMENT_CONFIG_DIR` |
| Trae | `~/.trae` | `TRAE_CONFIG_DIR` |
| Qwen Code | `~/.qwen` | `QWEN_CONFIG_DIR` |
| Kilo | `~/.config/kilo` | `KILO_CONFIG_DIR` |
| CodeBuddy | `~/.codebuddy` | `CODEBUDDY_CONFIG_DIR` |
| Cline | `~/.cline` | `CLINE_CONFIG_DIR` |

### Usando o Claude Code com provedores não-Anthropic

Mude para o perfil `inherit`: `/ecl-config --profile inherit`. Isso faz com que todos os agentes usem o modelo da sua sessão atual.

### Trabalhando em um projeto sensível/privado

Defina `commit_docs: false` durante `/ecl-new-project` ou via `/ecl-settings`. Adicione `.planning/` ao seu `.gitignore`.

### Uma atualização do eCL sobrescreveu minhas alterações locais

Desde a v1.17, o instalador faz backup de arquivos modificados localmente em `ecl-local-patches/`. Execute `/ecl-update --reapply` para mesclar suas alterações de volta.

### Não consigo atualizar via npm

Consulte [docs/manual-update.md](../manual-update.md) para um procedimento de atualização manual passo a passo.

### Diagnósticos de workflow (`/ecl-forensics`)

Quando um workflow falha de forma não óbvia, execute `/ecl-forensics` para gerar um relatório de diagnóstico cobrindo anomalias de histórico git, integridade de artefatos e inconsistências de estado. A saída vai para `.planning/forensics/`.

### Subagente executor recebe "Permission denied" em comandos Bash

Adicione os padrões necessários ao `~/.claude/settings.json`. Padrões principais necessários para todas as stacks:

```json
"Bash(git add:*)",
"Bash(git commit:*)",
"Bash(git merge:*)",
"Bash(git worktree:*)",
"Bash(git rebase:*)",
"Bash(git reset:*)",
"Bash(git checkout:*)",
"Bash(git switch:*)",
"Bash(git restore:*)",
"Bash(git stash:*)",
"Bash(git rm:*)",
"Bash(git mv:*)",
"Bash(git fetch:*)",
"Bash(git cherry-pick:*)",
"Bash(git apply:*)",
"Bash(gh:*)"
```

**Permissões por projeto:** adicione o mesmo bloco `permissions.allow` ao `.claude/settings.local.json` na raiz do seu projeto em vez de `~/.claude/settings.json`.

### Execução paralela causa erros de bloqueio de build

O eCL trata isso automaticamente desde a v1.26. Se você estiver em uma versão mais antiga, adicione ao `CLAUDE.md` do seu projeto:

```markdown
## Git Commit Rules for Agents
All subagent/executor commits MUST use `--no-verify`.
```

Para desativar a execução paralela completamente: `/ecl-settings` → defina `parallelization.enabled` como `false`.

---

## Referência rápida de recuperação

| Problema                                    | Solução                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Contexto perdido / nova sessão              | `/ecl-resume-work` ou `/ecl-progress`                                         |
| Fase deu errado                             | `git revert` dos commits da fase, depois replanejar                           |
| Precisa mudar o escopo                      | `/ecl-phase` (padrão), `/ecl-phase --insert` ou `/ecl-phase --remove`         |
| Algo quebrou                                | `/ecl-debug "description"` (adicione `--diagnose` para análise sem correções) |
| STATE.md fora de sincronia                  | `state validate` e depois `state sync`                                        |
| Estado do workflow parece corrompido        | `/ecl-forensics`                                                              |
| Correção rápida e pontual                   | `/ecl-quick`                                                                  |
| Plano não corresponde à sua visão           | `/ecl-discuss-phase [N]` e depois replanejar                                  |
| Custos altos                                | `/ecl-config --profile budget` e `/ecl-settings` para desativar agentes       |
| Atualização quebrou alterações locais       | `/ecl-update --reapply`                                                       |
| Quer resumo de sessão para stakeholders     | `/ecl-pause-work --report`                                                    |
| Não sabe qual é o próximo passo             | `/ecl-progress --next`                                                        |
| Erros de build em execução paralela         | Atualize o eCL ou defina `parallelization.enabled: false`                     |

---

## Estrutura de arquivos do projeto

```text
.planning/
  PROJECT.md              # Project vision and context (always loaded)
  REQUIREMENTS.md         # Scoped v1/v2 requirements with IDs
  ROADMAP.md              # Phase breakdown with status tracking
  STATE.md                # Decisions, blockers, session memory
  config.json             # Workflow configuration
  MILESTONES.md           # Completed milestone archive
  HANDOFF.json            # Structured session handoff (from /ecl-pause-work)
  research/               # Domain research from /ecl-new-project
  reports/                # Session reports (from /ecl-pause-work --report)
  todos/
    pending/              # Captured ideas awaiting work
    done/                 # Completed todos
  debug/                  # Active debug sessions
    resolved/             # Archived debug sessions
  spikes/                 # Feasibility experiments (from /ecl-spike)
    NNN-name/             # Experiment code + README with verdict
    MANIFEST.md           # Index of all spikes
  sketches/               # HTML mockups (from /ecl-sketch)
    NNN-name/             # index.html (2-3 variants) + README
    themes/
      default.css         # Shared CSS variables for all sketches
    MANIFEST.md           # Index of all sketches with winners
  codebase/               # Brownfield codebase mapping (from /ecl-map-codebase)
  phases/
    XX-phase-name/
      XX-YY-PLAN.md       # Atomic execution plans
      XX-YY-SUMMARY.md    # Execution outcomes and decisions
      CONTEXT.md          # Your implementation preferences
      RESEARCH.md         # Ecosystem research findings
      VERIFICATION.md     # Post-execution verification results
      XX-UI-SPEC.md       # UI design contract (from /ecl-ui-phase)
      XX-UI-REVIEW.md     # Visual audit scores (from /ecl-ui-review)
  ui-reviews/             # Screenshots from /ecl-ui-review (gitignored)
```

---

## Relacionados

- [Índice da documentação](README.md)
- [Comandos](COMMANDS.md)
- [Configuração](CONFIGURATION.md)
- [O ciclo de fase](explanation/the-phase-loop.md)
