import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

const MAX_PDF_IMAGE_SIZE = 16_777_216;
const MAX_PDF_PAGES = 500;

export async function extractPdfText(bytes: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes), {
    maxImageSize: MAX_PDF_IMAGE_SIZE,
  });

  try {
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF exceeds the ${MAX_PDF_PAGES}-page limit.`);
    }
    const { text } = await extractText(pdf, { mergePages: true });
    return text.trim();
  } finally {
    await pdf.loadingTask.destroy();
  }
}
