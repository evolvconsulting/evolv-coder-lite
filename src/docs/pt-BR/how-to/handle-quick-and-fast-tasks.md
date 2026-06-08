# Como lidar com tarefas rápidas e ágeis

Nem todo trabalho cabe dentro de uma fase. O eCL oferece dois comandos leves para trabalhos que não precisam do ciclo completo de discussão → planejamento → execução → verificação.

Para contexto sobre quando o pipeline completo de fases vale o custo, consulte [Engenharia de contexto](../explanation/context-engineering.md).

---

## Decidindo qual comando usar

| Situação | Comando |
|-----------|---------|
| Corrigir um bug, adicionar uma funcionalidade pequena ou qualquer tarefa que não possa ser resumida como uma única edição trivial | `/ecl-quick` |
| Corrigir um erro de digitação, atualizar um valor de configuração, adicionar uma entrada ao `.gitignore` ou qualquer alteração que toque ≤ 3 arquivos e leve menos de um minuto | `/ecl-fast` |
| A tarefa tem incógnitas, precisa de pesquisa ou vai tocar em mais do que um punhado de arquivos | `/ecl-quick` com `--research` |

**A regra prática:** se você hesitar por um momento sobre se a tarefa é trivial, use `/ecl-quick`. O `/ecl-fast` redireciona automaticamente para `/ecl-quick` se o escopo parecer não trivial.

---

## `/ecl-quick` — tarefas ad-hoc com garantias eCL

O `/ecl-quick` executa um planejador e executor com as mesmas garantias de commit atômico e rastreamento no STATE.md que uma fase completa, mas sem o custo de uma fase (sem entrada no ROADMAP, sem fase de discussão, sem coordenação de ondas entre múltiplos planos).

### Uso básico

```bash
/ecl-quick
```

O eCL solicita uma descrição da tarefa, então planeja e executa. Os artefatos ficam em `.planning/quick/`.

Você também pode passar a descrição diretamente:

```bash
/ecl-quick "Fix the login button not responding on mobile Safari"
```

### Flags

Adicione flags para incluir mais do pipeline de qualidade quando a tarefa exigir.

| Flag | O que adiciona |
|------|-------------|
| `--discuss` | Uma discussão leve de pré-planejamento que revela áreas cinzentas e registra suas decisões em um `CONTEXT.md` antes de o planejador rodar |
| `--research` | Um agente de pesquisa focado investiga abordagens, bibliotecas e armadilhas antes do planejamento |
| `--validate` | Verificação do plano (até 2 iterações) mais verificação pós-execução |
| `--full` | Tudo o que foi descrito acima — equivalente a `--discuss --research --validate` |

As flags se combinam livremente:

```bash
/ecl-quick --research --validate   # research + plan-checking + verification, no discuss
/ecl-quick --discuss               # just surface grey areas before planning
/ecl-quick --full                  # the complete quality pipeline
```

### Quando adicionar flags

- Adicione `--research` quando não tiver certeza de como abordar uma tarefa ou qual biblioteca usar.
- Adicione `--validate` quando a tarefa tocar caminhos de código críticos e você quiser que um agente verificador confirme se os requisitos foram atendidos.
- Adicione `--discuss` quando a tarefa tiver escolhas de design que você quer definir antes de o planejador rodar — por exemplo, quando o comportamento correto de tratamento de erros não é óbvio.
- Use `--full` quando uma tarefa for genuinamente significativa e você normalmente a planejaria como uma fase, mas ela não pertence ao ROADMAP.

### Listando e retomando tarefas rápidas

```bash
/ecl-quick list                    # show all quick tasks with status
/ecl-quick status my-task-slug     # show status of a specific task
/ecl-quick resume my-task-slug     # resume an interrupted task
```

---

## `/ecl-fast` — edições triviais inline

O `/ecl-fast` faz o trabalho diretamente no contexto atual. Não há subagentes, nenhum `PLAN.md` e nenhuma pesquisa. É adequado apenas para alterações que você mesmo poderia fazer em menos de um minuto.

```bash
/ecl-fast "fix typo in README"
/ecl-fast "add .env to .gitignore"
```

Se você omitir a descrição, o eCL vai solicitá-la.

O `/ecl-fast` verifica se a tarefa é realmente trivial antes de prosseguir. Se julgar o escopo muito grande, ele para e redireciona você:

```text
This looks like it needs planning. Use /ecl-quick instead:
  /ecl-quick "your task description"
```

Após fazer a alteração, o `/ecl-fast` faz commit atomicamente e, se uma tabela `Quick Tasks Completed` existir em `.planning/STATE.md`, acrescenta uma linha a ela.

---

## O que o `/ecl-quick` faz que o `/ecl-fast` não faz

| Capacidade | `/ecl-fast` | `/ecl-quick` |
|------------|------------|--------------|
| Planejador subagente | Não | Sim |
| Executor subagente | Não | Sim |
| Agente de pesquisa | Não | Opcional (`--research`) |
| Verificação de plano | Não | Opcional (`--validate`) |
| Verificação pós-execução | Não | Opcional (`--validate`) |
| Fase de discussão | Não | Opcional (`--discuss`) |
| Isolamento em worktree | Não | Sim (padrão) |
| Commits atômicos por tarefa | Commit único | Um por tarefa do plano |
| Rastreamento no STATE.md | Linha acrescentada se a tabela existir | Sempre atualizado |
| Artefatos em `.planning/quick/` | Não | Sim |

A distinção principal é o isolamento de subagentes. O `/ecl-quick` gera um planejador e executor novos em janelas de contexto separadas, o que significa que o trabalho é planejado adequadamente, os commits são atômicos por tarefa e o orquestrador pode verificar os resultados. O `/ecl-fast` usa apenas a janela de contexto atual e é intencionalmente limitado a alterações triviais o suficiente para não precisar de nada disso.

---

## Relacionados

- [O ciclo de fases](../explanation/the-phase-loop.md)
- [Engenharia de contexto](../explanation/context-engineering.md)
- [Comandos](../COMMANDS.md)
- [Índice de documentação](../README.md)
