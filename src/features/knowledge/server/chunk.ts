const chunkSize = 900;
const chunkOverlap = 120;

export function chunkText(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - chunkOverlap, start + 1);
  }

  return chunks.filter(Boolean);
}
