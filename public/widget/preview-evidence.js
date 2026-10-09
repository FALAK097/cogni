export const PREVIEW_EVIDENCE_EVENT = "cogni:widget-preview-evidence";

const MAX_HEADER_LENGTH = 8_000;
const MAX_SOURCE_COUNT = 4;
const MAX_TITLE_LENGTH = 160;

export function parseWidgetPreviewEvidence(headerValue) {
  if (
    typeof headerValue !== "string" ||
    headerValue.length === 0 ||
    headerValue.length > MAX_HEADER_LENGTH
  ) {
    return null;
  }

  try {
    const value = JSON.parse(decodeURIComponent(headerValue));
    if (
      typeof value !== "object" ||
      value === null ||
      (value.outcome !== "answer" && value.outcome !== "handoff") ||
      typeof value.grounded !== "boolean" ||
      !Array.isArray(value.sources)
    ) {
      return null;
    }

    const sources = value.sources
      .filter(
        (source) =>
          typeof source === "object" &&
          source !== null &&
          typeof source.title === "string" &&
          source.title.trim().length > 0,
      )
      .slice(0, MAX_SOURCE_COUNT)
      .map((source) => ({
        title: source.title.trim().slice(0, MAX_TITLE_LENGTH),
        ...(typeof source.documentId === "string" &&
        source.documentId.length > 0 &&
        source.documentId.length <= 128
          ? { documentId: source.documentId }
          : {}),
      }));

    if (value.grounded !== sources.length > 0) return null;
    if (value.outcome === "handoff" && (value.grounded || sources.length > 0)) return null;

    const prompt =
      typeof value.prompt === "string" && value.prompt.length <= 1_000 ? value.prompt : undefined;
    return {
      outcome: value.outcome,
      grounded: value.grounded,
      sources,
      ...(prompt === undefined ? {} : { prompt }),
    };
  } catch {
    return null;
  }
}
