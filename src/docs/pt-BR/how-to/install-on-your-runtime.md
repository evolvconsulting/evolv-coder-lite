# Como instalar o eCL Core no seu ambiente de execução

Instale o eCL Core (`@evolvconsulting/evolv-coder-lite`) no ambiente de codificação com IA que você usa no dia a dia. Este guia apresenta o caminho padrão de instalação para cada ambiente suportado e, em seguida, cobre o caminho manual para máquinas sem Node.js.

**O que você precisa:** Node.js 18+ e npm (ou npx). Se você não tem Node.js, vá para [Instalando sem Node.js](#instalando-sem-nodejs).

---

## Por que o instalador é necessário

O eCL Core distribui arquivos de agente e comando no formato nativo de frontmatter do Claude Code. Cada ambiente suportado espera um schema, layout de diretório e sintaxe de invocação de comandos diferente. O instalador realiza as transformações necessárias — por exemplo, convertendo listas de ferramentas e valores de cor para o OpenCode, escrevendo entradas TOML de agente para o Codex e reescrevendo o corpo de cada comando do formato com hífen (`/ecl-update`) para o formato com dois-pontos (`/ecl:update`) para o Gemini CLI.

**Não copie arquivos de `agents/` ou `commands/` diretamente.** Fazer isso ignora as transformações e produz erros de validação de schema ou comandos ausentes.

---

## Instalação padrão

Execute o instalador a partir de qualquer diretório. Ele solicita o seu ambiente e se a instalação deve ser global (todos os projetos) ou local (apenas este projeto).

```bash
npx @evolvconsulting/evolv-coder-lite@latest
```

Esse é o único comando necessário para uma instalação nova ou para executar o instalador novamente após trocar de ambiente.

---

## Instruções por ambiente

### Claude Code

```bash
npx @evolvconsulting/evolv-coder-lite@latest --claude --global
```

As habilidades são instaladas em `~/.claude/`. Os comandos aparecem como slash commands `/ecl-*` na sua próxima sessão do Claude Code. Reinicie o Claude Code para carregá-los.

**Substituir o diretório de instalação:**

```bash
CLAUDE_CONFIG_DIR=~/.claude-alt npx @evolvconsulting/evolv-coder-lite@latest --claude --global
```

---

### Gemini CLI

```bash
npx @evolvconsulting/evolv-coder-lite@latest --gemini --global
```

As habilidades são instaladas em `~/.gemini/`. O instalador reescreve todos os corpos de comando para o namespace de dois-pontos do Gemini (`/ecl:update`, `/ecl:config`, etc.). Reinicie o Gemini CLI após a instalação.

**Substituir o diretório de instalação:**

```bash
GEMINI_CONFIG_DIR=~/.gemini-alt npx @evolvconsulting/evolv-coder-lite@latest --gemini --global
```

---

### OpenCode

```bash
npx @evolvconsulting/evolv-coder-lite@latest --opencode --global
```

As habilidades são instaladas em `~/.config/opencode/` (XDG) ou `~/.opencode/`. O instalador converte o frontmatter dos agentes para o schema do OpenCode — removendo o campo `tools:` e convertendo valores de cor para hex. Consulte [Instalando sem Node.js — transformações do OpenCode](#opencode--transformações-necessárias) se você precisar entender o que muda.

**Substituir o diretório de instalação:**

```bash
OPENCODE_CONFIG_DIR=~/.config/opencode-alt npx @evolvconsulting/evolv-coder-lite@latest --opencode --global
```

---

### Kilo

```bash
npx @evolvconsulting/evolv-coder-lite@latest --kilo --global
```

As habilidades são instaladas em `~/.config/kilo/` (XDG) ou `~/.kilo/`. Usa o mesmo formato de comando markdown plano no estilo OpenCode.

**Substituir o diretório de instalação:**

```bash
KILO_CONFIG_DIR=~/.config/kilo-alt npx @evolvconsulting/evolv-coder-lite@latest --kilo --global
```

---

### Codex

```bash
npx @evolvconsulting/evolv-coder-lite@latest --codex --global
```

As habilidades são instaladas em `~/.codex/skills/ecl-*/SKILL.md`. Os agentes são registrados com entradas TOML por agente em `config.toml`. Reinicie o Codex (ou execute `codex --reload`) após a instalação.

**Versão mínima suportada:** Codex CLI 0.130.0. Versões anteriores tinham varredura adicional de raiz de habilidades que pode produzir listagens duplicadas.

---

### GitHub Copilot

```bash
npx @evolvconsulting/evolv-coder-lite@latest --copilot --global
```

As habilidades são instaladas em `~/.copilot/`. O eCL é instalado como arquivos de agente `.md` e arquivos de instrução de repositório.

**Substituir o diretório de instalação:**

```bash
COPILOT_CONFIG_DIR=~/.copilot-alt npx @evolvconsulting/evolv-coder-lite@latest --copilot --global
```

---

### Cursor

```bash
npx @evolvconsulting/evolv-coder-lite@latest --cursor --global
```

As habilidades são instaladas em `~/.cursor/`. O eCL instala habilidades, agentes e referências de regras.

**Substituir o diretório de instalação:**

```bash
CURSOR_CONFIG_DIR=~/.cursor-alt npx @evolvconsulting/evolv-coder-lite@latest --cursor --global
```

---

### Windsurf

```bash
npx @evolvconsulting/evolv-coder-lite@latest --windsurf --global
```

As habilidades são instaladas em `~/.codeium/windsurf/`. O eCL instala habilidades, agentes e regras de workspace.

**Substituir o diretório de instalação:**

```bash
WINDSURF_CONFIG_DIR=~/.codeium/windsurf-alt npx @evolvconsulting/evolv-coder-lite@latest --windsurf --global
```

---

### Cline

O Cline usa uma integração baseada em regras — o eCL é instalado como `.clinerules` em vez de slash commands.

```bash
# Instalação global (todos os projetos)
npx @evolvconsulting/evolv-coder-lite@latest --cline --global

# Instalação local (apenas este projeto)
npx @evolvconsulting/evolv-coder-lite@latest --cline --local
```

Instalações globais escrevem em `~/.cline/`. Instalações locais escrevem em `./.cline/`. As regras são carregadas automaticamente pelo Cline — nenhum slash command personalizado é registrado.

---

### CodeBuddy

```bash
npx @evolvconsulting/evolv-coder-lite@latest --codebuddy --global
```

As habilidades são instaladas em `~/.codebuddy/skills/ecl-*/SKILL.md`.

---

### Qwen Code

O Qwen Code usa o mesmo padrão de habilidades abertas do Claude Code 2.1.88+.

```bash
npx @evolvconsulting/evolv-coder-lite@latest --qwen --global
```

As habilidades são instaladas em `~/.qwen/skills/ecl-*/SKILL.md`.

**Substituir o diretório de instalação:**

```bash
QWEN_CONFIG_DIR=~/.qwen-alt npx @evolvconsulting/evolv-coder-lite@latest --qwen --global
```

---

### Augment Code

```bash
npx @evolvconsulting/evolv-coder-lite@latest --augment --global
```

As habilidades são instaladas em `~/.augment/`. O eCL instala habilidades e agentes. Sem posse de hook ou statusline.

---

### Antigravity

```bash
npx @evolvconsulting/evolv-coder-lite@latest --antigravity --global
```

O instalador detecta automaticamente o diretório de configuração do Antigravity (`~/.gemini/antigravity`, `~/.gemini/antigravity-ide` ou `~/.gemini/antigravity-cli`). Usa a política de configurações compatível com Gemini.

**Substituir o diretório de instalação:**

```bash
ANTIGRAVITY_CONFIG_DIR=~/.gemini/antigravity-alt npx @evolvconsulting/evolv-coder-lite@latest --antigravity --global
```

---

### Trae

```bash
npx @evolvconsulting/evolv-coder-lite@latest --trae --global
```

As habilidades são instaladas em `~/.trae/`. O eCL instala habilidades, agentes e referências de regras.

---

## Instalação local vs global

Todos os exemplos acima usam `--global`, que instala o eCL uma vez para a sua conta de usuário. Para limitar uma instalação a um único projeto, substitua `--global` por `--local`:

```bash
npx @evolvconsulting/evolv-coder-lite@latest --claude --local
```

Uma instalação local escreve no diretório `.claude/` na raiz do seu projeto. As configurações de instalação local têm precedência sobre as globais quando ambas existem.

---

## Instalando edições de pré-lançamento (Next / Nightly / Insiders / Preview)

As edições de pré-lançamento dos ambientes (Windsurf Next, Cursor Nightly, VS Code Insiders, canais de preview do Codex, etc.) leem de um diretório de configuração irmão. Defina a variável de ambiente `*_CONFIG_DIR` correspondente antes de executar o instalador:

```bash
WINDSURF_CONFIG_DIR=~/.codeium/windsurf-next npx @evolvconsulting/evolv-coder-lite@latest --windsurf --global
```

Selecione o ambiente estável correspondente no prompt do instalador. O eCL não enumera as edições de pré-lançamento como ambientes nomeados separados — elas são suportadas com melhor esforço por meio desse mecanismo de variável de ambiente e não são testadas separadamente no CI de lançamento.

---

## Instalando sem Node.js

Se você não pode executar `npx` (por exemplo, em uma máquina Windows sem Node.js), você tem duas opções.

**Opção A — Use uma máquina que tenha Node.js.** Qualquer máquina com Node.js serve: WSL, uma VM Linux, um runner de CI ou um contêiner Docker. Execute o instalador lá e, em seguida, copie o diretório de saída para a sua máquina de destino. Para o OpenCode:

```bash
npx @evolvconsulting/evolv-coder-lite@latest --opencode --global
# Depois copie ~/.config/opencode/agents/ para a máquina Windows
```

**Opção B — Transforme manualmente os arquivos-fonte.** Os arquivos-fonte dos agentes estão em `agents/` no repositório do eCL Core e estão no formato nativo de frontmatter do Claude Code. Cada ambiente espera um formato diferente. Para as transformações de campo exatas por ambiente, consulte [Instalação manual / configuração sem Node.js](../USER-GUIDE.md#manual-install--no-nodejs-setup) no Guia do Usuário, que cobre as transformações do OpenCode em detalhes completos e aponta para as funções `convert*Frontmatter` do instalador para outros ambientes.

---

## Após a instalação

Reinicie seu ambiente para carregar os novos comandos e agentes. Em seguida, inicie seu primeiro projeto:

```bash
/ecl-new-project
```

Se o comando não for encontrado após o reinício, verifique se o diretório de instalação corresponde ao caminho de configuração esperado pelo ambiente. A seção de edições de pré-lançamento acima cobre a incompatibilidade mais comum.

---

## Relacionados

- [Seu primeiro projeto](../tutorials/your-first-project.md)
- [Atualizar o eCL Core](update-ecl.md)
- [Configuração](../CONFIGURATION.md)
- [Índice da documentação](../README.md)
