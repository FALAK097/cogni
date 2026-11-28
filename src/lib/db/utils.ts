/**
 * Splits `items` into fixed-size chunks (useful for staying below Cloudflare D1's
 * 100 bound-parameter ceiling per prepared statement).
 */
export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`Chunk size must be a positive integer (received ${size}).`);
  }
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * Escapes SQL `LIKE` pattern metacharacters (`\`, `%`, `_`) for use with
 * `ESCAPE '\\'` in SQLite queries.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
