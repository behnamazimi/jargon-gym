/** Matches `serverActions.bodySizeLimit` in next.config.ts. A bigger commit is
 *  turned away before it reaches the action. */
export const MAX_COMMIT_BYTES = 3 * 1024 * 1024;

/** About how many bytes the browser sends for this payload. */
export function commitBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
