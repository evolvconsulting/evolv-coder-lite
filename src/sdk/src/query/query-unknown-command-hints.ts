export const UNKNOWN_COMMAND_HINTS: readonly string[] = [
  'Use a registered `ecl-sdk query` subcommand (see sdk/src/query/QUERY-HANDLERS.md).',
  'Invoke `node …/ecl-tools.cjs` for CJS-only operations.',
  'Unset ECL_QUERY_FALLBACK or set it to a non-restricted value to enable fallback.',
] as const;
