const SOURCE_TYPE_LABELS = {
  URL: "website",
  SITEMAP: "sitemap",
  TXT: "txt",
  PDF: "file",
  DOCX: "file",
} as const;

export function toKnowledgeSourceDisplayType(sourceType: string): string {
  return (
    SOURCE_TYPE_LABELS[sourceType.trim().toUpperCase() as keyof typeof SOURCE_TYPE_LABELS] ??
    "unknown"
  );
}
