# Referência de artefatos de planejamento

O diretório `.planning/` é a memória compartilhada do eCL Core para um projeto. Todos os fluxos de trabalho leem, gravam e deixam um rastro auditável de decisões. Esta página mapeia cada arquivo, sua finalidade e qual comando o produz ou consome. Consulte o [índice de documentação](../README.md).

---

## Estrutura de diretórios

```
.planning/
├── PROJECT.md                          # Identidade do projeto e valor central
├── ROADMAP.md                          # Listagem de marcos e fases com objetivos
├── REQUIREMENTS.md                     # Critérios de aceitação numerados
├── STATE.md                            # Rastreador de posição em andamento
├── config.json                         # Configuração de fluxo de trabalho e modelo
├── MILESTONES.md                       # Arquivo de marcos (opcional)
├── BACKLOG.md                          # Trabalho adiado e futuro (opcional)
├── LEARNINGS.md                        # Aprendizados acumulados entre fases (opcional)
├── DECISIONS-INDEX.md                  # Resumo contínuo de decisões anteriores (opcional)
├── METHODOLOGY.md                      # Frameworks interpretativos reutilizáveis (opcional)
├── HANDOFF.json                        # Estado de pausa legível por máquina (transitório)
├── codebase/                           # Mapas do código-base (opcional)
│   ├── architecture.md
│   ├── stack.md
│   └── ...
├── intel/                              # Índice de símbolos consultável (opcional, intel.enabled)
│   └── API-SURFACE.md
└── phases/
    └── <NN>-<slug>/                    # Um diretório por fase
        ├── <NN>-CONTEXT.md             # Decisões de implementação (discuss-phase)
        ├── <NN>-DISCUSSION-LOG.md      # Auditoria legível da discussão (discuss-phase)
        ├── <NN>-RESEARCH.md            # Resultados de pesquisa técnica (plan-phase)
        ├── <NN>-VALIDATION.md          # Estratégia de cobertura de testes Nyquist (plan-phase)
        ├── <NN>-PATTERNS.md            # Mapa de análogos do código-base (plan-phase, opcional)
        ├── <NN>-<PP>-PLAN.md           # Plano executável (plan-phase, um por plano)
        ├── <NN>-<PP>-SUMMARY.md        # Registro de execução (execute-phase, um por plano)
        ├── <NN>-VERIFICATION.md        # Relatório de verificação dos objetivos da fase (verify-phase)
        ├── <NN>-UAT.md                 # Estado persistente de sessão UAT (execute-phase)
        └── .continue-here.md           # Instruções de retomada após pausa (pause-work)
```

---

## Artefatos no nível raiz

### `PROJECT.md`

| | |
|---|---|
| **Finalidade** | Identidade canônica do projeto: o que é, para quem é, valor central, requisitos, restrições e decisões-chave. Atualizado ao longo do ciclo de vida do projeto conforme o produto evolui. |
| **Produzido por** | `/ecl-new-project` (criação inicial); atualizado por `/ecl-complete-milestone` à medida que as decisões são validadas. |
| **Consumido por** | Todos os fluxos de trabalho de planejamento; `ecl-phase-researcher`, `ecl-planner` (contexto); `discuss-phase` (decisões anteriores); `ecl-plan-checker` (restrições do projeto). |

### `ROADMAP.md`

| | |
|---|---|
| **Finalidade** | Listagem de marcos e fases com objetivos, IDs de requisitos, critérios de sucesso e referências canônicas por fase. A fonte única de verdade sobre o que o projeto está construindo e em que ordem. |
| **Produzido por** | `/ecl-new-project` (criação inicial); atualizado por `/ecl-phase --insert` e `/ecl-complete-milestone`. |
| **Consumido por** | `/ecl-discuss-phase`, `/ecl-plan-phase`, `/ecl-execute-phase`; todos os comandos de orquestração que precisam de informações de fase; `ecl-planner`, `ecl-plan-checker`, `ecl-phase-researcher`. |

### `REQUIREMENTS.md`

| | |
|---|---|
| **Finalidade** | Critérios de aceitação numerados e verificáveis para o projeto. Cada requisito possui um ID (ex.: `AUTH-01`) que mapeia para as fases do roadmap. Marca os requisitos como concluídos conforme as fases são executadas. |
| **Produzido por** | `/ecl-new-project` (criação inicial); requisitos marcados como concluídos por `execute-phase`. |
| **Consumido por** | `ecl-planner` (os planos devem contemplar todos os IDs de requisitos da fase); `ecl-plan-checker` Dimensão 1 (cobertura de requisitos); `discuss-phase` (requisitos anteriores). |

### `STATE.md`

| | |
|---|---|
| **Finalidade** | Rastreador de posição em andamento — fase e plano atuais, métricas de progresso, decisões acumuladas, notas de continuidade de sessão. Lido no início de toda execução de fluxo de trabalho. Atualizado após cada ação significativa. |
| **Produzido por** | `/ecl-new-project` (criação inicial); atualizado continuamente por todos os fluxos de fase, `/ecl-pause-work`, `/ecl-resume-work`. |
| **Consumido por** | Todos os fluxos de orquestração; `/ecl-progress`; execução de tarefas avulsas via `/ecl-quick`; `ecl-planner` e `ecl-phase-researcher` (decisões do projeto). |

Consulte o [esquema de STATE.md](state-md.md) para a referência completa de campos.

### `config.json`

| | |
|---|---|
| **Finalidade** | Configuração do fluxo de trabalho: perfis de modelo, alternâncias de pesquisa e verificador de plano, estratégia de ramificação git, validação Nyquist, configurações de paralelização e substituições de modelo por agente. |
| **Produzido por** | `/ecl-new-project` (criação inicial); `/ecl-settings` (edição interativa). |
| **Consumido por** | Todos os fluxos de trabalho e subagentes — lido no momento de inicialização via `ecl-tools query config-get`. |

Consulte [CONFIGURATION](../CONFIGURATION.md) para o esquema completo.

### `MILESTONES.md` (opcional)

| | |
|---|---|
| **Finalidade** | Registro histórico de marcos concluídos. Preenchido à medida que cada marco é encerrado; fornece um instantâneo de arquivo do que foi entregue e quando. |
| **Produzido por** | `/ecl-complete-milestone`. |
| **Consumido por** | `/ecl-audit-milestone`; revisão humana. |

### `DECISIONS-INDEX.md` (opcional)

| | |
|---|---|
| **Finalidade** | Resumo contínuo limitado de decisões capturadas em arquivos CONTEXT.md de fases anteriores. Quando presente, o `discuss-phase` lê este único arquivo em vez de ler até três arquivos CONTEXT.md anteriores individualmente, economizando orçamento de contexto. |
| **Produzido por** | Gerado quando o número de fases anteriores ultrapassa o limite de leitura contínua. |
| **Consumido por** | `discuss-phase` (etapa `load_prior_context`). |

### `HANDOFF.json` (transitório)

| | |
|---|---|
| **Finalidade** | Estado de pausa legível por máquina gravado quando o trabalho é interrompido. Contém o ponto de retomada, contexto em andamento e instruções de continuação. Consumido exatamente uma vez — na retomada. |
| **Produzido por** | `/ecl-pause-work`. |
| **Consumido por** | `/ecl-resume-work`. |

---

## Artefatos por fase

Todos os arquivos por fase ficam em `.planning/phases/<NN>-<slug>/`, onde `NN` é o número da fase com zero à esquerda e `slug` é o nome da fase com hifens.

### `<NN>-CONTEXT.md`

| | |
|---|---|
| **Finalidade** | Decisões de implementação capturadas antes do início do planejamento. Contém o limite da fase (`<domain>`), decisões bloqueadas com identificadores `D-NN` (`<decisions>`), referências canônicas de documentos (`<canonical_refs>`), insights de código existente (`<code_context>`), inspirações específicas (`<specifics>`) e ideias adiadas (`<deferred>`). |
| **Produzido por** | `/ecl-discuss-phase` (discussão interativa ou caminhos expressos PRD/ADR). |
| **Consumido por** | `ecl-phase-researcher` (o que investigar); `ecl-planner` (decisões bloqueadas); `ecl-plan-checker` Dimensão 7 (conformidade de contexto). |

Consulte o [esquema de CONTEXT.md](context-md.md) para a referência completa de campos.

### `<NN>-DISCUSSION-LOG.md`

| | |
|---|---|
| **Finalidade** | Rastro de auditoria legível da sessão de discuss-phase: áreas discutidas, opções apresentadas, seleções feitas, ideias adiadas e itens deixados ao critério do Claude. Não é consumido por fluxos de trabalho automatizados. |
| **Produzido por** | `/ecl-discuss-phase` (etapa `git_commit`). |
| **Consumido por** | Revisão humana; retrospectivas. |

### `<NN>-RESEARCH.md`

| | |
|---|---|
| **Finalidade** | Resultados de pesquisa técnica produzidos antes do planejamento. Responde à pergunta "O que preciso saber para planejar bem esta fase?" — abrange análise de domínio, padrões, riscos, um Mapa de Responsabilidade Arquitetural e uma seção de Arquitetura de Validação (usada pelo gate Nyquist). |
| **Produzido por** | `/ecl-plan-phase` via agente `ecl-phase-researcher`. |
| **Consumido por** | `ecl-planner` (entradas de planejamento); `ecl-plan-checker` Dimensão 7c (conformidade de camada), Dimensão 8 (Nyquist), Dimensão 11 (resolução de pesquisa); `ecl-pattern-mapper` (fonte de lista de arquivos). |

### `<NN>-VALIDATION.md`

| | |
|---|---|
| **Finalidade** | Estratégia de validação inspirada no Nyquist, derivada da seção `## Validation Architecture` do RESEARCH.md. Especifica requisitos de cobertura de testes automatizados que os planos devem respeitar. |
| **Produzido por** | `/ecl-plan-phase` (Etapa 5.5, quando `workflow.nyquist_validation` está habilitado e o RESEARCH.md contém uma seção de Arquitetura de Validação). |
| **Consumido por** | `ecl-plan-checker` Dimensão 8 (gate Check 8e — deve existir antes de os checks Nyquist prosseguirem); `ecl-verifier`. |

### `<NN>-PATTERNS.md`

| | |
|---|---|
| **Finalidade** | Mapa de análogos do código-base produzido pelo `ecl-pattern-mapper`. Para cada arquivo a ser criado ou modificado nesta fase, identifica o análogo existente mais próximo, classifica o papel e o fluxo de dados do arquivo e extrai trechos concretos de código. Orienta o planejador em direção a padrões consistentes. |
| **Produzido por** | `/ecl-plan-phase` via agente `ecl-pattern-mapper` (opcional; ignorado se `workflow.pattern_mapper: false`). |
| **Consumido por** | `ecl-planner` (orientação de padrões); `ecl-plan-checker` Dimensão 12 (conformidade de padrões). |

### `<NN>-<PP>-PLAN.md`

| | |
|---|---|
| **Finalidade** | Plano executável para uma única unidade de trabalho dentro da fase. Contém frontmatter YAML (onda, dependências, arquivos, requisitos, `must_haves`), um objetivo, referências de contexto, tarefas estruturadas em XML com campos `<read_first>`, `<action>`, `<verify>` e `<acceptance_criteria>`, e critérios de verificação. |
| **Produzido por** | `/ecl-plan-phase` via agente `ecl-planner`. Um arquivo por plano — ex.: `03-02-PLAN.md` é Fase 3, Plano 2. |
| **Consumido por** | `/ecl-execute-phase` (agente executor lê o plano e executa as tarefas); `ecl-plan-checker` (revisão de qualidade pré-execução); `ecl-verifier` (lê `must_haves` para verificação pós-execução). |

Consulte o [esquema de PLAN.md](plan-md.md) para a referência completa de campos.

### `<NN>-<PP>-SUMMARY.md`

| | |
|---|---|
| **Finalidade** | Registro de execução gravado após a conclusão de um plano. Documenta o que foi construído, desvios em relação ao plano, uma autoverificação em relação aos critérios de aceitação e o grafo de dependências da fase. |
| **Produzido por** | Agente executor de `execute-phase` (gravado ao final da execução de cada plano). |
| **Consumido por** | `/ecl-progress` (status da fase); `ecl-planner` (quando um plano subsequente tem dependência genuína da saída de um plano anterior); `milestone-summary`. |

### `<NN>-VERIFICATION.md`

| | |
|---|---|
| **Finalidade** | Relatório de verificação dos objetivos da fase. Verifica `must_haves.truths`, `must_haves.artifacts` e `must_haves.key_links` de todos os planos em relação ao código-base real após a execução. Registra `status: passed | gaps_found | human_needed`. |
| **Produzido por** | `/ecl-verify-work` (ou a etapa de verificação dentro de `/ecl-execute-phase`). |
| **Consumido por** | Gate de fase encerrada do `plan-phase` (um VERIFICATION.md com `status: passed` marca a fase como `Complete` e bloqueia replanejamento sem `--force`); `/ecl-progress`; revisão humana. |

### `<NN>-UAT.md`

| | |
|---|---|
| **Finalidade** | Rastreamento persistente de sessão UAT. Registra cada caso de teste, comportamento observável esperado, resultado e resposta do desenvolvedor ao longo de uma sessão UAT ativa. Carrega frontmatter YAML (`status`, `phase`, `source`, timestamps). |
| **Produzido por** | `/ecl-audit-uat` (sessão UAT interativa). |
| **Consumido por** | `/ecl-audit-uat` (retomada de uma sessão UAT anterior). |

### `.continue-here.md`

| | |
|---|---|
| **Finalidade** | Instruções de retomada legíveis gravadas quando o trabalho em uma fase é pausado. Contém contexto para agentes retomarem: antipadrões críticos, problemas bloqueantes, leitura obrigatória e o comando exato para retomar. |
| **Produzido por** | `/ecl-pause-work`. |
| **Consumido por** | Qualquer fluxo de trabalho que inicia em uma fase — tanto `discuss-phase` quanto `plan-phase` verificam a existência deste arquivo na entrada e exigem que o agente demonstre compreensão de quaisquer antipadrões `blocking` antes de prosseguir. |

---

## Convenções de nomenclatura

| Segmento | Formato | Exemplo |
|---|---|---|
| Diretório de fase | `<NN>-<slug>` | `03-post-feed` |
| Arquivo de nível de fase | `<NN>-<ARTIFACT>.md` | `03-CONTEXT.md` |
| Arquivo de nível de plano | `<NN>-<PP>-<ARTIFACT>.md` | `03-02-PLAN.md` |
| `NN` | Número da fase com zero à esquerda | `03` para Fase 3 |
| `PP` | Número do plano com zero à esquerda dentro da fase | `02` para Plano 2 |

Quando `project_code` está definido no `config.json`, os diretórios de fase usam o código do projeto como prefixo: `CK-03-post-feed` para o código de projeto `CK`, Fase 3.

---

## Relacionados

- [Esquema de STATE.md](state-md.md)
- [Esquema de CONTEXT.md](context-md.md)
- [Esquema de PLAN.md](plan-md.md)
- [Índice de documentação](../README.md)
