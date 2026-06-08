# Como migrar do eCL-2

**Objetivo:** Atualizar um projeto eCL-2 mais antigo (estrutura de diretório `.ecl/`) para o eCL Core (estrutura `.planning/`), e opcionalmente absorver quaisquer ADRs, PRDs ou especificações existentes no repositório para a nova estrutura de planejamento.

**Pré-requisitos:** eCL Core está instalado. O diretório do projeto eCL-2 está disponível em disco.

---

## Entenda o que é migrado

O eCL-2 usava um diretório `.ecl/` como raiz de planejamento. O eCL Core usa `.planning/`. A migração faz a conversão: lê os artefatos de `.ecl/` e os grava na estrutura padrão `.planning/` que todos os comandos eCL Core esperam.

| O que existe no eCL-2 | O que `/ecl-import --from-ecl2` produz |
|-----------------------|----------------------------------------|
| `.ecl/PROJECT.md` | `.planning/PROJECT.md` |
| `.ecl/ROADMAP.md` | `.planning/ROADMAP.md` |
| `.ecl/STATE.md` | `.planning/STATE.md` |
| `.ecl/phases/` diretórios | `.planning/phases/` diretórios |
| Arquivos `PLAN.md` de fase | Arquivos `{NN}-{MM}-PLAN.md` do eCL Core (renomeação aplicada) |

A detecção de conflitos é executada antes que qualquer arquivo seja gravado. Se o diretório de destino já tiver um `PROJECT.md` e o conteúdo importado contradizê-lo, a migração para no ponto de bloqueio (BLOCKER) e lista os conflitos para você resolver.

---

## Execute a migração

### Migrar o diretório atual

```bash
/ecl-import --from-ecl2
```

O eCL lê `.ecl/` no diretório de trabalho atual e grava os artefatos migrados em `.planning/`.

### Migrar a partir de um caminho diferente

```bash
/ecl-import --from-ecl2 --path ~/projects/old-project
```

Use `--path` quando o projeto eCL-2 não for seu diretório de trabalho atual.

---

## Resolva conflitos

Se a detecção de conflitos encontrar bloqueadores — por exemplo, uma declaração de stack tecnológico do eCL-2 que contradiz um `.planning/PROJECT.md` existente — ela imprime um relatório de conflitos e para sem gravar nenhum arquivo.

Leia o relatório, resolva a contradição (edite o documento de origem ou o artefato de planejamento existente) e execute `/ecl-import --from-ecl2` novamente. A migração pode ser executada novamente com segurança até ser concluída sem problemas.

---

## Importe um arquivo de plano externo

Se você tiver um documento de plano avulso (um documento de planejamento de equipe, uma especificação em Markdown, uma lista de tarefas exportada) em vez de um projeto eCL-2 completo, use `--from`:

```bash
/ecl-import --from /tmp/team-plan.md
```

O eCL executa a mesma passagem de detecção de conflitos, converte o conteúdo para o formato `PLAN.md` do eCL Core e valida o resultado com o verificador de planos. Após a validação, você verá o nome do arquivo de destino e os próximos passos.

---

## Absorva documentação existente

Se o seu repositório já contiver ADRs (Architecture Decision Records), PRDs ou documentos de especificação, use `/ecl-ingest-docs` para sintetizá-los na estrutura `.planning/` após a migração:

### Varrer o repositório inteiro (detecta o modo automaticamente)

```bash
/ecl-ingest-docs
```

Se `.planning/` já estiver presente (por exemplo, a partir da migração que você acabou de executar), o eCL usa o modo de mesclagem por padrão — ele sintetiza os documentos ingeridos junto com o que já existe, em vez de sobrescrevê-los.

### Limitar a um diretório específico

```bash
/ecl-ingest-docs docs/
/ecl-ingest-docs docs/adr/
```

### Usar um manifesto de precedência explícito

Quando os documentos têm tipos mistos ou você deseja controlar qual documento prevalece em caso de conflitos:

```bash
/ecl-ingest-docs --manifest ingest.yaml
```

O manifesto é um arquivo YAML que lista `{path, type, precedence?}` por documento. Consulte a descrição do flag `--manifest` em [Comandos](../COMMANDS.md) para o formato esperado.

### Forçar um modo específico

```bash
/ecl-ingest-docs --mode merge     # Mesclar com o .planning/ existente
/ecl-ingest-docs --mode new       # Inicializar do zero (sobrescreve)
```

**Saída:** `/ecl-ingest-docs` sempre produz um `INGEST-CONFLICTS.md` com três categorias — resolvidos automaticamente, variantes concorrentes e bloqueadores não resolvidos. Revise este arquivo após cada execução de ingestão. Paradas forçadas ocorrem apenas em contradições LOCKED-vs-LOCKED de ADRs; todo o resto é apresentado para sua revisão, não descartado silenciosamente.

---

## Verifique o projeto migrado

Após a migração e qualquer ingestão de documentos, confirme que o estado do projeto está consistente:

```bash
/ecl-health
/ecl-health --repair
```

`/ecl-health` verifica a integridade do diretório `.planning/` e relata qualquer desvio. `--repair` corrige automaticamente os problemas recuperáveis.

Em seguida, verifique se o eCL Core consegue ler o estado do seu projeto:

```bash
/ecl-progress
```

Se o projeto foi migrado corretamente, você verá o status da fase atual e o próximo passo recomendado. A partir daí, o fluxo de trabalho padrão do eCL Core se aplica.

---

## Condicionais: o que é migrado e o que não é

| Situação | O que fazer |
|----------|-------------|
| `.ecl/` existe no diretório atual | Execute `/ecl-import --from-ecl2` (sem `--path`) |
| `.ecl/` está em um diretório diferente | Use `--path ~/projects/old-project` |
| Você tem um documento de plano avulso, não um projeto eCL-2 completo | Use `/ecl-import --from /path/to/plan.md` |
| Você tem ADRs em `docs/adr/` | Execute `/ecl-ingest-docs docs/adr/` após a migração |
| Você tem uma mistura de ADRs, PRDs e especificações | Execute `/ecl-ingest-docs` na raiz do repositório; ele classifica automaticamente |
| A detecção de conflitos relata bloqueadores | Resolva as contradições listadas e execute novamente; nenhum arquivo é gravado até que todos os bloqueadores sejam resolvidos |
| Você não tem certeza se a migração funcionou | Execute `/ecl-health` e `/ecl-progress` para confirmar |
| INGEST-CONFLICTS.md lista bloqueadores não resolvidos | Estes exigem resolução manual antes que os documentos afetados sejam incorporados ao planejamento |

---

## Relacionados

- [Seu primeiro projeto](../tutorials/your-first-project.md)
- [Comandos](../COMMANDS.md)
- [Índice de documentação](../README.md)
