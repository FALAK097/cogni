import "server-only";

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type PdfParseModule = typeof import("pdf-parse");

export async function extractPdfText(bytes: Buffer) {
  const { PDFParse } = require("pdf-parse") as PdfParseModule;
  const parser = new PDFParse({ data: bytes });

  try {
    const parsed = await parser.getText();
    return parsed.text.trim();
  } finally {
    await parser.destroy();
  }
}
