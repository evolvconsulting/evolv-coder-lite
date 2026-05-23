# Referência de Comandos do eCL

Este documento descreve os comandos principais do eCL em Português.  
Para detalhes completos de flags avançadas e mudanças recentes, consulte também a [versão em inglês](../COMMANDS.md).

---

## Fluxo Principal

| Comando | Finalidade | Quando usar |
|---------|------------|-------------|
| `/ecl-new-project` | Inicialização completa: perguntas, pesquisa, requisitos e roadmap | Início de projeto |
| `/ecl-discuss-phase [N]` | Captura decisões de implementação (`--chain`, `--power`) | Antes do planejamento |
| `/ecl-ui-phase [N]` | Gera contrato de UI (`UI-SPEC.md`) | Fases com frontend |
| `/ecl-plan-phase [N]` | Pesquisa + planejamento + verificação | Antes de executar uma fase |
| `/ecl-execute-phase <N>` | Executa planos em ondas paralelas | Após planejamento aprovado |
| `/ecl-verify-work [N]` | UAT manual com diagnóstico automático | Após execução |
| `/ecl-ship [N]` | Cria PR da fase validada | Ao concluir a fase |
| `/ecl-progress --next` | Detecta e executa o próximo passo lógico | Qualquer momento |
| `/ecl-fast <texto>` | Tarefa curta sem planejamento completo | Ajustes triviais |

## Navegação e Sessão

| Comando | Finalidade |
|---------|------------|
| `/ecl-progress` | Mostra status atual e próximos passos |
| `/ecl-resume-work` | Retoma contexto da sessão anterior |
| `/ecl-pause-work` | Salva handoff estruturado |
| `/ecl-pause-work --report` | Gera resumo da sessão |
| `/ecl-autonomous` | Executa todas as fases restantes de forma autônoma (`--from N`, `--to N`, `--only N`) |
| `/ecl-help` | Lista comandos e uso |
| `/ecl-update` | Atualiza o eCL |

## Gestão de Fases

| Comando | Finalidade |
|---------|------------|
| `/ecl-phase` | Adiciona fase no roadmap |
| `/ecl-phase --insert [N]` | Insere trabalho urgente entre fases |
| `/ecl-phase --remove [N]` | Remove fase futura e reenumera |
| `/ecl-discuss-phase --assumptions [N]` | Mostra abordagem assumida pelo Claude |

## Brownfield e Utilidades

| Comando | Finalidade |
|---------|------------|
| `/ecl-map-codebase` | Mapeia base existente antes de novo projeto |
| `/ecl-quick` | Tarefas ad-hoc com garantias do eCL |
| `/ecl-debug [desc]` | Debug sistemático com estado persistente (`--diagnose` para modo diagnóstico) |
| `/ecl-manager --analyze-deps` | Detecta dependências entre fases e sugere `Depends on` no ROADMAP.md (v1.32) |
| `/ecl-forensics` | Diagnóstico de falhas no workflow |
| `/ecl-settings` | Configuração de agentes, perfil e toggles |
| `/ecl-config --profile <perfil>` | Troca rápida de perfil de modelo |

## Qualidade de Código

| Comando | Finalidade |
|---------|------------|
| `/ecl-review` | Peer review com múltiplas IAs |
| `/ecl-pr-branch` | Cria branch limpa sem commits de planejamento |
| `/ecl-audit-uat` | Audita dívida de validação/UAT |

## Backlog e Threads

| Comando | Finalidade |
|---------|------------|
| `/ecl-capture --backlog <desc>` | Adiciona item no backlog (999.x) |
| `/ecl-review-backlog` | Promove, mantém ou remove itens |
| `/ecl-capture --seed <ideia>` | Registra ideia com gatilho futuro |
| `/ecl-thread [nome]` | Gerencia threads persistentes |

## Gerenciamento de Estado

| Comando | Finalidade |
|---------|------------|
| `state validate` | Detecta drift entre STATE.md e o filesystem real |
| `state sync` | Reconstrói STATE.md a partir do estado real no disco |
| `state sync --verify` | Dry-run: mostra mudanças propostas sem gravar |
| `state planned-phase --phase N --plans N` | Registra transição de estado após plan-phase |

```bash
node ecl-tools.cjs state validate          # Detectar drift
node ecl-tools.cjs state sync --verify     # Prévia do que sync mudaria
node ecl-tools.cjs state sync              # Reconstruir STATE.md a partir do disco
```

---

## Exemplo rápido

```bash
/ecl-new-project
/ecl-discuss-phase 1
/ecl-plan-phase 1
/ecl-execute-phase 1
/ecl-verify-work 1
/ecl-ship 1
```
