# Como atualizar o eCL Core

Atualize uma instalação existente do eCL Core para a versão mais recente, visualize o changelog antes de confirmar e recupere personalizações locais que a atualização sobrescreveria.

**O que você precisa:** O mesmo ambiente de execução para o qual o eCL está instalado. O comando de atualização re-executa o instalador internamente, portanto requer Node.js e npx disponíveis (mesmos requisitos da instalação original).

---

## O caminho padrão de atualização

De dentro do seu ambiente de execução de IA, execute:

```bash
/ecl-update
```

O eCL irá:

1. Detectar a versão instalada e o escopo da instalação (global ou local).
2. Verificar no npm a versão mais recente do `@evolvconsulting/evolv-coder-lite`.
3. Buscar o changelog e exibir o que mudou entre sua versão instalada e a mais recente.
4. Solicitar confirmação antes de alterar qualquer coisa.
5. Fazer backup de quaisquer arquivos adicionados pelo usuário encontrados dentro de diretórios gerenciados pelo eCL para `ecl-user-files-backup/`.
6. Executar o instalador (`npx @evolvconsulting/evolv-coder-lite@latest --<runtime> --<scope>`).
7. Limpar o cache de verificação de atualização para que o indicador na barra de status seja redefinido.
8. Informar se arquivos eCL modificados localmente foram copiados para `ecl-local-patches/`.

Reinicie seu ambiente de execução após a atualização para carregar os novos comandos e agentes.

---

## Flags

| Flag | O que faz |
|------|-----------|
| `--sync` | Após atualizar, sincroniza habilidades do registro eCL |
| `--reapply` | Após atualizar, mescla arquivos eCL modificados localmente de volta a partir de `ecl-local-patches/` |

```bash
/ecl-update --sync        # Update and sync skills
/ecl-update --reapply     # Update and reapply local patches
```

---

## Revisando o changelog antes de atualizar

`/ecl-update` sempre exibe o diff do changelog entre sua versão instalada e a mais recente *antes* de solicitar confirmação. Não é necessário acessar o GitHub separadamente. A saída tem a seguinte aparência:

```text
## eCL Update Available

Installed: 1.39.0
Latest:    1.41.0

### What's New
────────────────────────────────────────────────────────────
[changelog entries for 1.40.0 and 1.41.0]
────────────────────────────────────────────────────────────

Proceed with update? [Yes, update now / No, cancel]
```

Se o changelog não puder ser obtido (sem acesso à rede, falha no npm), a atualização ainda prossegue após a confirmação — ela não é bloqueada pela disponibilidade do changelog.

---

## Recuperando personalizações locais

### Arquivos que você adicionou dentro de diretórios gerenciados pelo eCL

Se você colocou arquivos personalizados dentro de diretórios que o eCL gerencia (por exemplo, agentes personalizados com o prefixo `ecl-` ou arquivos extras em `commands/ecl/`), o instalador os detectará e os copiará para `ecl-user-files-backup/` antes de limpar esses diretórios. Após a atualização, restaure-os manualmente a partir desse local de backup.

Arquivos colocados fora de diretórios gerenciados pelo eCL — agentes personalizados sem o prefixo `ecl-`, comandos personalizados fora de `commands/ecl/`, seus arquivos `CLAUDE.md` e hooks personalizados — nunca são tocados pelo instalador.

### Arquivos eCL que você modificou diretamente

Se você editou um arquivo instalado pelo eCL (por exemplo, ajustando o prompt de sistema de um agente), o instalador detecta a modificação por meio de uma comparação de hash com seu manifesto, faz backup do arquivo em `ecl-local-patches/` e, em seguida, o substitui pela nova versão. Após a atualização:

```bash
/ecl-update --reapply
```

Esse comando mescla suas modificações de `ecl-local-patches/` de volta aos arquivos recém-instalados.

Se você pulou o `--reapply` após uma atualização anterior e deseja aplicar os patches agora:

```bash
/ecl-update --reapply
```

É seguro executar `--reapply` de forma independente sem acionar um novo download — se você já estiver na versão mais recente, o eCL ignora a etapa de instalação e vai direto para a reaplicação dos patches.

---

## Quando o npm está indisponível

Se `npx @evolvconsulting/evolv-coder-lite@latest` falhar devido a uma falha no npm, restrições de rede ou porque você está trabalhando a partir do repositório de código-fonte, use o procedimento de atualização manual em [docs/manual-update.md](../../manual-update.md). Esse documento aborda como fazer pull do commit mais recente, compilar o dist dos hooks e executar `node bin/install.js` diretamente.

---

## Se você já está na versão mais recente

`/ecl-update` encerra imediatamente com uma mensagem de confirmação — sem download, sem instalação, sem necessidade de reinicialização.

---

## Migrações do instalador

Cada versão do eCL pode incluir migrações do instalador que renomeiam, movem ou removem arquivos gerenciados. A camada de migração é executada automaticamente antes que o novo payload do pacote seja gravado. Migrações que afetariam arquivos que você modificou solicitam confirmação em vez de agir silenciosamente. Para o design completo e o registro do contrato de configuração de tempo de execução, consulte [docs/installer-migrations.md](../../installer-migrations.md).

---

## Relacionados

- [Instalar no seu ambiente de execução](install-on-your-runtime.md)
- [Referência de comandos](../COMMANDS.md)
- [Atualização manual](../../manual-update.md)
- [Migrações do instalador](../../installer-migrations.md)
- [Índice da documentação](../README.md)
