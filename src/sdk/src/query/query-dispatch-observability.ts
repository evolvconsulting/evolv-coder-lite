export function fallbackBridgeNotices(command: string): string[] {
  return [
    `[ecl-sdk] '${command}' not in native registry; falling back to ecl-tools.cjs.`,
    '[ecl-sdk] Transparent bridge — prefer adding a native handler when parity matters.',
  ];
}
