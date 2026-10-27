export const PREVIEW_EVIDENCE_EVENT = "cogni:widget-preview-evidence";

const MAX_HEADER_LENGTH = 8_000;
const MAX_SOURCE_COUNT = 4;
const MAX_TITLE_LENGTH = 160;
const MAX_MODEL_NAME_LENGTH = 120;

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
      !Array.isArray(value.sources) ||
      (value.modelProvider !== "OPENAI" && value.modelProvider !== "GOOGLE") ||
      typeof value.modelName !== "string" ||
      value.modelName.length === 0 ||
      value.modelName.length > MAX_MODEL_NAME_LENGTH ||
      typeof value.configFingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.configFingerprint) ||
      (value.runId === undefined) !== (value.caseId === undefined) ||
      (value.runId !== undefined &&
        (typeof value.runId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.runId))) ||
      (value.caseId !== undefined &&
        (typeof value.caseId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.caseId))) ||
      (value.runId !== undefined && typeof value.signedEvidence !== "string") ||
      (value.signedEvidence !== undefined &&
        (typeof value.signedEvidence !== "string" ||
          value.signedEvidence.length === 0 ||
          value.signedEvidence.length > 8_000)) ||
      (value.runId !== undefined && typeof value.signedEvidence !== "string")
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
        ...(typeof source.revisionId === "string" && source.revisionId.length <= 128
          ? { revisionId: source.revisionId }
          : { revisionId: null }),
        ...(Number.isInteger(source.revisionNumber) && source.revisionNumber > 0
          ? { revisionNumber: source.revisionNumber }
          : { revisionNumber: null }),
      }));

    if (value.grounded !== sources.length > 0) return null;
    if (value.outcome === "handoff" && (value.grounded || sources.length > 0)) return null;

    const prompt =
      typeof value.prompt === "string" && value.prompt.length <= 1_000 ? value.prompt : undefined;
    return {
      outcome: value.outcome,
      grounded: value.grounded,
      modelProvider: value.modelProvider,
      modelName: value.modelName,
      configFingerprint: value.configFingerprint,
      ...(typeof value.signedEvidence === "string" ? { signedEvidence: value.signedEvidence } : {}),
      sources,
      ...(value.runId === undefined ? {} : { runId: value.runId, caseId: value.caseId }),
      ...(prompt === undefined ? {} : { prompt }),
    };
  } catch {
    return null;
  }
}
