import "server-only";

const knowledgeMimeTypes = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/plain",
} as const;

export function inferKnowledgeMimeType(filename: string, mimeType: string) {
  if (mimeType && mimeType !== "application/octet-stream") {
    return mimeType;
  }

  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) {
    return mimeType || "application/octet-stream";
  }

  return knowledgeMimeTypes[extension as keyof typeof knowledgeMimeTypes] ?? mimeType;
}

export function knowledgeSourceTypeFromMime(mimeType: string) {
  if (mimeType === "application/pdf") {
    return "PDF" as const;
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "DOCX" as const;
  }

  return "TXT" as const;
}
