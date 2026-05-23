# Guia do Usuário do eCL

Referência detalhada de workflows, troubleshooting e configuração. Para setup rápido, veja o [README](../../README.pt-BR.md).

---

## Sumário

- [Fluxo de trabalho](#fluxo-de-trabalho)
- [Contrato de UI](#contrato-de-ui)
- [Backlog e Threads](#backlog-e-threads)
- [Workstreams](#workstreams)
- [Segurança](#segurança)
- [Referência de comandos](#referência-de-comandos)
- [Configuração](#configuração)
- [Exemplos de uso](#exemplos-de-uso)
- [Troubleshooting](#troubleshooting)
- [Recuperação rápida](#recuperação-rápida)

---

## Fluxo de trabalho

Fluxo recomendado por fase:

1. `/ecl-discuss-phase [N]` — trava preferências de implementação
2. `/ecl-ui-phase [N]` — contrato visual para fases frontend
3. `/ecl-plan-phase [N]` — pesquisa + plano + validação
4. `/ecl-execute-phase [N]` — execução em ondas paralelas
5. `/ecl-verify-work [N]` — UAT manual com diagnóstico
6. `/ecl-ship [N]` — cria PR (opcional)

Para iniciar projeto novo:

```bash
/ecl-new-project
```

Para seguir automaticamente o próximo passo:

```bash
/ecl-progress --next
```

### Nyquist Validation

Durante `plan-phase`, o eCL pode mapear requisitos para comandos de teste automáticos antes da implementação. Isso gera `{phase}-VALIDATION.md` e aumenta a confiabilidade de verificação pós-execução.

Desativar:

```json
{
  "workflow": {
    "nyquist_validation": false
  }
}
```

### Modo de discussão por suposições

Com `workflow.discuss_mode: "assumptions"`, o eCL analisa o código antes de perguntar, apresenta suposições estruturadas e pede apenas correções.

---

## Contrato de UI

### Comandos

| Comando | Descrição |
|---------|-----------|
| `/ecl-ui-phase [N]` | Gera contrato de design `UI-SPEC.md` para a fase |
| `/ecl-ui-review [N]` | Auditoria visual retroativa em 6 pilares |

### Quando usar

- Rode `/ecl-ui-phase` depois de `/ecl-discuss-phase` e antes de `/ecl-plan-phase`.
- Rode `/ecl-ui-review` após execução/validação para avaliar qualidade visual e consistência.

### Configurações relacionadas

| Setting | Padrão | O que controla |
|---------|--------|----------------|
| `workflow.ui_phase` | `true` | Gera contratos de UI para fases frontend |
| `workflow.ui_safety_gate` | `true` | Ativa gate de segurança para componentes de registry |

---

## Backlog e Threads

### Backlog (999.x)

Ideias fora da sequência ativa vão para backlog:

```bash
/ecl-capture --backlog "Camada GraphQL"
/ecl-capture --backlog "Responsividade mobile"
```

Promover/revisar:

```bash
/ecl-review-backlog
```

### Seeds

Seeds guardam ideias futuras com condição de gatilho:

```bash
/ecl-capture --seed "Adicionar colaboração real-time quando infra de WebSocket estiver pronta"
```

### Threads persistentes

Threads são contexto leve entre sessões:

```bash
/ecl-thread
/ecl-thread fix-deploy-key-auth
/ecl-thread "Investigar timeout TCP"
```

---

## Workstreams

Workstreams permitem trabalho paralelo sem colisão de estado de planejamento.

| Comando | Função |
|---------|--------|
| `/ecl-workstreams create <name>` | Cria workstream isolado |
| `/ecl-workstreams switch <name>` | Troca workstream ativo |
| `/ecl-workstreams list` | Lista workstreams |
| `/ecl-workstreams complete <name>` | Finaliza e arquiva workstream |

`workstreams` compartilham o mesmo código/git, mas isolam artefatos de `.planning/`.

---

## Segurança

O eCL aplica defesa em profundidade:

- prevenção de path traversal em entradas de arquivo
- detecção de prompt injection em texto do usuário
- hooks de proteção para escrita em `.planning/`
- scanner CI para padrões de injeção em agentes/workflows/comandos

Para arquivos sensíveis, use deny list no Claude Code.

---

## Referência de comandos

### Fluxo principal

| Comando | Quando usar |
|---------|-------------|
| `/ecl-new-project` | Início de projeto |
| `/ecl-discuss-phase [N]` | Definir preferências antes do plano |
| `/ecl-plan-phase [N]` | Criar e validar planos |
| `/ecl-execute-phase [N]` | Executar planos em ondas |
| `/ecl-verify-work [N]` | UAT manual |
| `/ecl-ship [N]` | Gerar PR da fase |
| `/ecl-progress --next` | Próximo passo automático |

### Gestão e utilidades

| Comando | Quando usar |
|---------|-------------|
| `/ecl-progress` | Ver status atual |
| `/ecl-resume-work` | Retomar sessão |
| `/ecl-pause-work` | Pausar com handoff |
| `/ecl-pause-work --report` | Resumo da sessão |
| `/ecl-quick` | Tarefa ad-hoc com garantias eCL |
| `/ecl-debug [desc]` | Debug sistemático |
| `/ecl-forensics` | Diagnóstico de workflow quebrado |
| `/ecl-settings` | Ajustar workflow/modelos |
| `/ecl-config --profile <profile>` | Troca rápida de perfil |

Para lista completa e flags avançadas, consulte [Command Reference](../COMMANDS.md).

---

## Configuração

Arquivo de configuração: `.planning/config.json`

### Núcleo

| Setting | Opções | Padrão |
|---------|--------|--------|
| `mode` | `interactive`, `yolo` | `interactive` |
| `granularity` | `coarse`, `standard`, `fine` | `standard` |
| `model_profile` | `quality`, `balanced`, `budget`, `inherit` | `balanced` |

### Workflow

| Setting | Padrão |
|---------|--------|
| `workflow.research` | `true` |
| `workflow.plan_check` | `true` |
| `workflow.verifier` | `true` |
| `workflow.nyquist_validation` | `true` |
| `workflow.ui_phase` | `true` |
| `workflow.ui_safety_gate` | `true` |

### Perfis de modelo

| Perfil | Uso recomendado |
|--------|------------------|
| `quality` | trabalho crítico, maior qualidade |
| `balanced` | padrão recomendado |
| `budget` | reduzir custo de tokens |
| `inherit` | seguir modelo da sessão/runtime |

Detalhes completos: [Configuration Reference](../CONFIGURATION.md).

---

## Exemplos de uso

### Projeto novo

```bash
claude --dangerously-skip-permissions
/ecl-new-project
/ecl-discuss-phase 1
/ecl-ui-phase 1
/ecl-plan-phase 1
/ecl-execute-phase 1
/ecl-verify-work 1
/ecl-ship 1
```

### Código já existente

```bash
/ecl-map-codebase
/ecl-new-project
```

### Correção rápida

```bash
/ecl-quick
> "Corrigir botão de login no mobile Safari"
```

### Preparação para release

```bash
/ecl-audit-milestone
/ecl-complete-milestone
```

---

## Troubleshooting

### "Project already initialized"

`.planning/PROJECT.md` já existe. Apague `.planning/` se quiser reiniciar do zero.

### Sessão longa degradando contexto

Use `/clear` entre etapas grandes e retome com `/ecl-resume-work` ou `/ecl-progress`.

### Plano desalinhado

Rode `/ecl-discuss-phase [N]` antes do plano e valide suposições com `/ecl-discuss-phase --assumptions [N]`.

### Execução falhou ou saiu com stubs

Replaneje com escopo menor (tarefas menores por plano).

### Custo alto

Use perfil budget:

```bash
/ecl-config --profile budget
```

### Runtime não-Claude (Codex/OpenCode/Gemini/Kilo)

Use `resolve_model_ids: "omit"` para deixar o runtime resolver modelos padrão.

---

## Recuperação rápida

| Problema | Solução |
|---------|---------|
| Perdeu contexto | `/ecl-resume-work` ou `/ecl-progress` |
| Fase deu errado | `git revert` + replanejar |
| Precisa alterar escopo | `/ecl-phase`, `/ecl-phase --insert`, `/ecl-phase --remove` |
| Bug em workflow | `/ecl-forensics` |
| Correção pontual | `/ecl-quick` |
| Custo alto | `/ecl-config --profile budget` |
| Não sabe próximo passo | `/ecl-progress --next` |

---

## Estrutura de arquivos do projeto

```text
.planning/
  PROJECT.md
  REQUIREMENTS.md
  ROADMAP.md
  STATE.md
  config.json
  MILESTONES.md
  HANDOFF.json
  research/
  reports/
  todos/
  debug/
  codebase/
  phases/
    XX-phase-name/
      XX-YY-PLAN.md
      XX-YY-SUMMARY.md
      CONTEXT.md
      RESEARCH.md
      VERIFICATION.md
      XX-UI-SPEC.md
      XX-UI-REVIEW.md
  ui-reviews/
```

> [!NOTE]
> Esta é a versão pt-BR do guia para uso diário. Para detalhes técnicos exatos e cobertura completa de parâmetros avançados, consulte também o [guia original em inglês](../USER-GUIDE.md).
