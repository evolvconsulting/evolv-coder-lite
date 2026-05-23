# @evolvconsulting/ecl-sdk

TypeScript SDK for **evolv Coder Lite**: deterministic query/mutation handlers, plan execution, and event-stream telemetry so agents focus on judgment, not shell plumbing.

## Install

```bash
npm install @evolvconsulting/ecl-sdk
```

## Quickstart — programmatic

```typescript
import { eCL, createRegistry } from '@evolvconsulting/ecl-sdk';

const ecl = new eCL({ projectDir: process.cwd(), sessionId: 'my-run' });
const tools = ecl.createTools();

const registry = createRegistry(ecl.eventStream, 'my-run');
const { data } = await registry.dispatch('state.json', [], process.cwd());
```

## Quickstart — CLI

From a project that depends on this package, **invoke the CLI with Node** (recommended in CI and local dev):

```bash
node ./node_modules/@evolvconsulting/ecl-sdk/dist/cli.js query state.json
node ./node_modules/@evolvconsulting/ecl-sdk/dist/cli.js query roadmap.analyze
```

If no native handler is registered for a command, the CLI can transparently shell out to `evolv-coder-lite/bin/ecl-tools.cjs` (see stderr warning), unless `ECL_QUERY_FALLBACK=off`.

## What ships

| Area | Entry |
|------|--------|
| Query registry | `createRegistry()` in `src/query/index.ts` — same handlers as `ecl-sdk query` |
| Tools bridge | `GSDTools` — native dispatch with optional CJS subprocess fallback |
| Orchestrators | `PhaseRunner`, `InitRunner`, `eCL` |
| CLI | `ecl-sdk` — `query`, `run`, `init`, `auto` |

## Guides

- **Handler registry & contracts:** [`src/query/QUERY-HANDLERS.md`](src/query/QUERY-HANDLERS.md)
- **Repository docs** (when present): `docs/ARCHITECTURE.md`, `docs/CLI-TOOLS.md` at repo root

## Environment

| Variable | Purpose |
|----------|---------|
| `ECL_QUERY_FALLBACK` | `off` / `never` disables CLI fallback to `ecl-tools.cjs` for unknown commands |
| `ECL_AGENTS_DIR` | Override directory scanned for installed eCL agents (`~/.claude/agents` by default) |
