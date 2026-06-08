# Referência de Ferramentas CLI do eCL

> Referência para o CLI `ecl-tools` (`evolv-coder-lite/bin/ecl-tools.cjs`). Para comandos slash e fluxos de usuário, consulte a [Referência de Comandos](COMMANDS.md). Voltar ao [índice de documentação](README.md).

---

## Visão Geral

`ecl-tools.cjs` centraliza a análise de configuração, resolução de modelos, busca de fases, commits git, verificação de resumos, gerenciamento de estado e operações de templates em comandos, fluxos de trabalho e agentes do eCL.


|                    |                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Caminho instalado**   | `evolv-coder-lite/bin/ecl-tools.cjs`                                                                                                                                                                      |
| **Implementação** | 20 módulos de domínio em `evolv-coder-lite/bin/lib/` (o diretório é autoritativo)                                                                                                                        |
| **Status**         | Principal superfície de comandos em tempo de execução para orquestração, fluxos de trabalho e automação. |


**Uso (CJS):**

```bash
node ecl-tools.cjs <command> [args] [--raw] [--cwd <path>]
```

**Flags globais (CJS):**


| Flag           | Descrição                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `--raw`        | Saída legível por máquina (JSON ou texto simples, sem formatação)                  |
| `--cwd <path>` | Substitui o diretório de trabalho (para subagentes em sandbox)                         |
| `--ws <name>`  | Contexto de fluxo de trabalho para caminhos `.planning/workstreams/<name>` |


---

## Comandos de Estado

Gerencia `.planning/STATE.md` — a memória viva do projeto.

```bash
# Carrega configuração completa do projeto + estado como JSON
node ecl-tools.cjs state load

# Exibe o frontmatter do STATE.md como JSON
node ecl-tools.cjs state json

# Atualiza um único campo
node ecl-tools.cjs state update <field> <value>

# Obtém o conteúdo do STATE.md ou uma seção específica
node ecl-tools.cjs state get [section]

# Atualiza múltiplos campos em lote
node ecl-tools.cjs state patch --field1 val1 --field2 val2

# Incrementa o contador de planos
node ecl-tools.cjs state advance-plan

# Registra métricas de execução
node ecl-tools.cjs state record-metric --phase N --plan M --duration Xmin [--tasks N] [--files N]

# Recalcula a barra de progresso
node ecl-tools.cjs state update-progress

# Adiciona uma decisão
node ecl-tools.cjs state add-decision --summary "..." [--phase N] [--rationale "..."]
# Ou a partir de arquivos:
node ecl-tools.cjs state add-decision --summary-file path [--rationale-file path]

# Adiciona/resolve bloqueadores
node ecl-tools.cjs state add-blocker --text "..."
node ecl-tools.cjs state resolve-blocker --text "..."

# Registra continuidade da sessão
node ecl-tools.cjs state record-session --stopped-at "..." [--resume-file path]

# Início de fase — atualiza Status/Última atividade do STATE.md para uma nova fase
node ecl-tools.cjs state begin-phase --phase N --name SLUG --plans COUNT

# Sinalização de bloqueador detectável por agentes (usado por discuss-phase / fluxos de UI)
node ecl-tools.cjs state signal-waiting --type TYPE --question "..." --options "A|B" --phase P
node ecl-tools.cjs state signal-resume
```

### Snapshot de Estado

Análise estruturada do STATE.md completo:

```bash
node ecl-tools.cjs state-snapshot
```

Retorna JSON com: posição atual, fase, plano, status, decisões, bloqueadores, métricas, última atividade.

---

## Comandos de Fase

Gerencia fases — diretórios, numeração e sincronização com o roadmap.

```bash
# Localiza diretório de fase pelo número
node ecl-tools.cjs find-phase <phase>

# Calcula o próximo número de fase decimal para inserções
node ecl-tools.cjs phase next-decimal <phase>

# Adiciona nova fase ao roadmap + cria diretório
node ecl-tools.cjs phase add <description>

# Insere fase decimal após a existente
node ecl-tools.cjs phase insert <after> <description>

# Remove fase, renumera as subsequentes
node ecl-tools.cjs phase remove <phase> [--force]

# Marca a fase como concluída, atualiza estado + roadmap
node ecl-tools.cjs phase complete <phase>

# Indexa planos com ondas e status
node ecl-tools.cjs phase-plan-index <phase>

# Lista fases com filtragem
node ecl-tools.cjs phases list [--type planned|executed|all] [--phase N] [--include-archived]
```

---

## Comandos de Roadmap

Analisa e atualiza o `ROADMAP.md`.

```bash
# Extrai a seção de fase do ROADMAP.md
node ecl-tools.cjs roadmap get-phase <phase>

# Análise completa do roadmap com status em disco
node ecl-tools.cjs roadmap analyze

# Atualiza linha da tabela de progresso a partir do disco
node ecl-tools.cjs roadmap update-plan-progress <N>
```

---

## Comandos de Configuração

Lê e grava em `.planning/config.json`.

```bash
# Inicializa config.json com valores padrão
node ecl-tools.cjs config-ensure-section

# Define um valor de configuração (notação de ponto)
node ecl-tools.cjs config-set <key> <value>

# Obtém um valor de configuração
node ecl-tools.cjs config-get <key>

# Define o perfil de modelo
node ecl-tools.cjs config-set-model-profile <profile>
```

---

## Resolução de Modelos

```bash
# Obtém o modelo para um agente com base no perfil atual
node ecl-tools.cjs resolve-model <agent-name>
# A saída bruta retorna o ID/tier do modelo selecionado.
# A saída JSON também inclui o perfil e, quando o runtime ativo suporta,
# reasoning_effort.
```

Nomes de agentes: `ecl-planner`, `ecl-executor`, `ecl-phase-researcher`, `ecl-project-researcher`, `ecl-research-synthesizer`, `ecl-verifier`, `ecl-plan-checker`, `ecl-integration-checker`, `ecl-roadmapper`, `ecl-debugger`, `ecl-codebase-mapper`, `ecl-nyquist-auditor`

---

## Comandos de Verificação

Valida planos, fases, referências e commits.

```bash
# Verifica arquivo SUMMARY.md
node ecl-tools.cjs verify-summary <path> [--check-count N]

# Verifica estrutura + tarefas do PLAN.md
node ecl-tools.cjs verify plan-structure <file>

# Verifica se todos os planos têm resumos
node ecl-tools.cjs verify phase-completeness <phase>

# Verifica se @-refs + caminhos resolvem
node ecl-tools.cjs verify references <file>

# Verifica hashes de commit em lote
node ecl-tools.cjs verify commits <hash1> [hash2] ...

# Verifica must_haves.artifacts
node ecl-tools.cjs verify artifacts <plan-file>

# Verifica must_haves.key_links
node ecl-tools.cjs verify key-links <plan-file>
```

---

## Comandos de Validação

Verifica a integridade do projeto.

```bash
# Verifica numeração de fases, sincronização disco/roadmap
node ecl-tools.cjs validate consistency

# Verifica integridade de .planning/, com opção de reparo
node ecl-tools.cjs validate health [--repair]

# Verifica utilização da janela de contexto para linha de status / chamadores de hook (v1.40.0)
node ecl-tools.cjs validate context

# Utilização de contexto como superfície JSON tipada (#455)
node ecl-tools.cjs validate context --json
```

`validate context` emite um envelope estruturado com `utilization`, `status`
(`ok` / `warn` / `critical` nos limites de 60% / 70%), e uma
string `suggestion`. Os mesmos dados sustentam `/ecl-health --context`.
Passe `--json` para receber o IR tipado diretamente (útil em scripts e asserções de teste).

---

## Comandos de Template

Seleção e preenchimento de templates.

```bash
# Seleciona o template de resumo com base na granularidade
node ecl-tools.cjs template select <type>

# Preenche o template com variáveis
node ecl-tools.cjs template fill <type> --phase N [--plan M] [--name "..."] [--type execute|tdd] [--wave N] [--fields '{json}']
```

Tipos de template para `fill`: `summary`, `plan`, `verification`

---

## Comandos de Frontmatter

Operações CRUD de frontmatter YAML em qualquer arquivo Markdown.

```bash
# Extrai frontmatter como JSON
node ecl-tools.cjs frontmatter get <file> [--field key]

# Atualiza único campo
node ecl-tools.cjs frontmatter set <file> --field key --value jsonVal

# Mescla JSON no frontmatter
node ecl-tools.cjs frontmatter merge <file> --data '{json}'

# Valida campos obrigatórios
node ecl-tools.cjs frontmatter validate <file> --schema plan|summary|verification
```

---

## Comandos de Scaffold

Cria arquivos e diretórios pré-estruturados.

```bash
# Cria template CONTEXT.md
node ecl-tools.cjs scaffold context --phase N

# Cria template UAT.md
node ecl-tools.cjs scaffold uat --phase N

# Cria template VERIFICATION.md
node ecl-tools.cjs scaffold verification --phase N

# Cria diretório de fase
node ecl-tools.cjs scaffold phase-dir --phase N --name "phase name"
```

---

## Comandos Init (Carregamento de Contexto Composto)

Carrega todo o contexto necessário para um fluxo de trabalho específico em uma única chamada. Retorna JSON com informações do projeto, configuração, estado e dados específicos do fluxo de trabalho.

```bash
node ecl-tools.cjs init execute-phase <phase>
node ecl-tools.cjs init plan-phase <phase>
node ecl-tools.cjs init new-project
node ecl-tools.cjs init new-milestone
node ecl-tools.cjs init quick <description>
node ecl-tools.cjs init resume
node ecl-tools.cjs init verify-work <phase>
node ecl-tools.cjs init phase-op <phase>
node ecl-tools.cjs init todos [area]
node ecl-tools.cjs init milestone-op
node ecl-tools.cjs init map-codebase
node ecl-tools.cjs init progress

# Init com escopo de fluxo de trabalho (flag `--ws`)
node ecl-tools.cjs init execute-phase <phase> --ws <name>
node ecl-tools.cjs init plan-phase <phase> --ws <name>
```

**Tratamento de payloads grandes:** Quando a saída excede ~50KB, o CLI grava em um arquivo temporário e retorna `@file:/tmp/ecl-init-XXXXX.json`. Os fluxos de trabalho verificam o prefixo `@file:` e leem do disco:

```bash
INIT=$(node ecl-tools.cjs init execute-phase "1")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

---

## Comandos de Milestone

```bash
# Arquiva milestone
node ecl-tools.cjs milestone complete <version> [--name <name>] [--archive-phases]

# Marca requisitos como concluídos
node ecl-tools.cjs requirements mark-complete <ids>
# Aceita: REQ-01,REQ-02 ou REQ-01 REQ-02 ou [REQ-01, REQ-02]
```

---

## Habilidades de Agente

Emite o bloco de habilidades para um tipo de agente específico.

```bash
# Emite bloco XML bruto de habilidades (padrão — seguro para expansão de shell)
node ecl-tools.cjs agent-skills <agent-type>

# Emite superfície JSON tipada (#455) — { agent_type, block, skills_count }
node ecl-tools.cjs agent-skills <agent-type> --json
```

A flag `--json` retorna um objeto IR tipado adequado para consumo estruturado e asserções de teste, enquanto o padrão (sem flag) preserva a saída XML bruta que as expansões de shell de fluxo de trabalho necessitam.

---

## Manifesto de Habilidades

Pré-computa e armazena em cache a descoberta de habilidades para carregamento mais rápido de comandos.

```bash
# Gera manifesto de habilidades (grava em .claude/skill-manifest.json)
node ecl-tools.cjs skill-manifest

# Gera com caminho de saída personalizado
node ecl-tools.cjs skill-manifest --output <path>
```

Retorna mapeamento JSON de todas as habilidades eCL disponíveis com seus metadados (nome, descrição, caminho de arquivo, dicas de argumentos). Usado pelo instalador e hooks de início de sessão para evitar varreduras repetidas do sistema de arquivos.

---

## Comandos Utilitários

```bash
# Converte texto em slug seguro para URL
node ecl-tools.cjs generate-slug "Some Text Here"
# → some-text-here

# Obtém timestamp
node ecl-tools.cjs current-timestamp [full|date|filename]

# Conta e lista tarefas pendentes
node ecl-tools.cjs list-todos [area]

# Verifica existência de arquivo/diretório
node ecl-tools.cjs verify-path-exists <path>

# Agrega todos os dados de SUMMARY.md
node ecl-tools.cjs history-digest

# Extrai dados estruturados de SUMMARY.md
node ecl-tools.cjs summary-extract <path> [--fields field1,field2]

# Estatísticas do projeto
node ecl-tools.cjs stats [json|table]

# Renderização de progresso (legível por humanos)
node ecl-tools.cjs progress [json|table|bar]

# Progresso como superfície JSON tipada (#455)
node ecl-tools.cjs progress --json

# Conclui uma tarefa
node ecl-tools.cjs todo complete <filename>

# Auditoria UAT — verifica todas as fases em busca de itens não resolvidos
node ecl-tools.cjs audit-uat

# Fila de auditoria entre artefatos — verifica `.planning/` em busca de itens de auditoria não resolvidos
node ecl-tools.cjs audit-open [--json]

# Migração reversa de um projeto eCL-2 para a estrutura atual (suporta `/ecl-import --from-ecl2`)
node ecl-tools.cjs from-ecl2 [--path <dir>] [--force] [--dry-run]

# Commit git com verificações de configuração
node ecl-tools.cjs commit <message> [--files f1 f2] [--amend] [--no-verify] [--respect-staged]
```

> `--no-verify`: Ignora hooks de pré-commit. Usado por agentes executores paralelos durante a execução baseada em ondas para evitar contenção de bloqueio de build (ex.: conflitos de cargo lock em projetos Rust). O orquestrador executa os hooks uma vez após cada onda ser concluída. Não use `--no-verify` durante a execução sequencial — deixe os hooks rodarem normalmente.
> `--files <paths>` **comportamento de staging**: por padrão, `--files` executa `git add -- <path>` para cada arquivo nomeado antes de commitar. Isso sobrescreve qualquer staging por hunk configurado via `git add -p`. Passe `--respect-staged` para ignorar o passo `git add` e commitar apenas o que já está no índice dentro do pathspec solicitado. Se nada estiver staged nesse escopo, o comando retorna `{ committed: false, reason: 'nothing staged' }` sem erro. O `-- <paths>` pathspec final no commit é aplicado em ambos os modos, portanto arquivos staged fora do escopo `--files` nunca são incluídos (invariante #3061).

```bash
# Busca na web (requer chave de API do Brave)
node ecl-tools.cjs websearch <query> [--limit N] [--freshness day|week|month]
```

---

## Graphify

Constrói, consulta e inspeciona o grafo de conhecimento do projeto em `.planning/graphs/`. Requer `graphify.enabled: true` em `config.json` (consulte a [Referência de Configuração](CONFIGURATION.md#graphify-settings)).

```bash
# Constrói ou reconstrói o grafo de conhecimento
node ecl-tools.cjs graphify build

# Pesquisa um termo no grafo
node ecl-tools.cjs graphify query <term>

# Exibe atualidade e estatísticas do grafo
node ecl-tools.cjs graphify status

# Exibe alterações desde a última construção
node ecl-tools.cjs graphify diff

# Grava um snapshot nomeado do grafo atual
node ecl-tools.cjs graphify snapshot [name]
```

Ponto de entrada para o usuário: `/ecl-graphify` (consulte a [Referência de Comandos](COMMANDS.md#ecl-graphify)).

---

## Arquitetura de Módulos

| Módulo | Arquivo | Exportações |
|--------|------|---------|
| Core | `lib/core.cjs` | `error()`, `output()`, `parseArgs()`, utilitários compartilhados, re-exportações de compatibilidade |
| State | `lib/state.cjs` | Todos os subcomandos `state`, `state-snapshot` |
| Phase | `lib/phase.cjs` | CRUD de fase, `find-phase`, `phase-plan-index`, `phases list` |
| Planning Workspace | `lib/planning-workspace.cjs` | Costura de planejamento: `planningDir`, `planningPaths`, roteamento de fluxo de trabalho ativo, `.planning/.lock` |
| Roadmap | `lib/roadmap.cjs` | Análise de roadmap, extração de fase, atualizações de progresso |
| Config | `lib/config.cjs` | Leitura/gravação de configuração, inicialização de seção |
| Verify | `lib/verify.cjs` | Todos os comandos de verificação e validação |
| Template | `lib/template.cjs` | Seleção de template e preenchimento de variáveis |
| Frontmatter | `lib/frontmatter.cjs` | CRUD de frontmatter YAML |
| Init | `lib/init.cjs` | Carregamento de contexto composto para todos os fluxos de trabalho |
| Milestone | `lib/milestone.cjs` | Arquivamento de milestone, marcação de requisitos |
| Commands | `lib/commands.cjs` | Diversos: slug, timestamp, todos, scaffold, stats, websearch |
| Model Profiles | `lib/model-profiles.cjs` | Tabela de resolução de perfis |
| UAT | `lib/uat.cjs` | Auditoria UAT/verificação entre fases |
| Profile Output | `lib/profile-output.cjs` | Formatação de perfil do desenvolvedor |
| Profile Pipeline | `lib/profile-pipeline.cjs` | Pipeline de análise de sessão |
| Graphify | `lib/graphify.cjs` | Construção/consulta/status/diff/snapshot do grafo de conhecimento (suporta `/ecl-graphify`) |
| Learnings | `lib/learnings.cjs` | Extrai aprendizados de artefatos de fases/SUMMARY (suporta `/ecl-extract-learnings`) |
| Audit | `lib/audit.cjs` | Manipuladores de fila de auditoria de fase/milestone; helper `audit-open` |
| GSD2 Import | `lib/ecl2-import.cjs` | Importador de migração reversa de projetos eCL-2 (suporta `/ecl-import --from-ecl2`) |
| Intel | `lib/intel.cjs` | Índice de inteligência de código consultável (suporta `/ecl-map-codebase --query`) |

---

## Roteamento CLI do Revisor

`review.models.<cli>` mapeia um sabor de revisor para um comando shell invocado pelo fluxo de trabalho de revisão de código. Defina via [`/ecl-config --integrations`](COMMANDS.md#ecl-config) ou diretamente:

```bash
node ecl-tools.cjs config-set review.models.codex    "codex exec --model gpt-5"
node ecl-tools.cjs config-set review.models.gemini   "gemini -m gemini-2.5-pro"
node ecl-tools.cjs config-set review.models.opencode "opencode run --model claude-sonnet-4"
node ecl-tools.cjs config-set review.models.claude   ""   # limpa — retorna ao modelo da sessão
```

Os slugs são validados contra `[a-zA-Z0-9_-]+`; slugs vazios ou contendo caminhos são rejeitados. Consulte [`docs/CONFIGURATION.md`](CONFIGURATION.md#code-review-cli-routing) para a referência completa do campo.

## Tratamento de Segredos

As chaves de API configuradas via `/ecl-settings` (`brave_search`, `firecrawl`, `exa_search`) são gravadas em texto simples em `.planning/config.json`, mas são mascaradas (`****<last-4>`) em toda saída de `config-set` / `config-get`, tabela de confirmação e prompt interativo. Consulte `evolv-coder-lite/bin/lib/secrets.cjs` para a implementação do mascaramento. O próprio arquivo `config.json` é o limite de segurança — proteja-o com permissões do sistema de arquivos e mantenha-o fora do git (`.planning/` está no gitignore por padrão).

---

## Relacionados

- [Comandos](COMMANDS.md)
- [Configuração](CONFIGURATION.md)
- [Arquitetura](ARCHITECTURE.md)
- [índice de documentação](README.md)
