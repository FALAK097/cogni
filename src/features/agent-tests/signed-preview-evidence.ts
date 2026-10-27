import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const signedPreviewEvidencePayloadSchema = z.object({
  workspaceId: z.string().min(1).max(128),
  prompt: z.string().max(4_000),
  outcome: z.enum(["answer", "handoff"]),
  grounded: z.boolean(),
  modelProvider: z.enum(["OPENAI", "GOOGLE"]),
  modelName: z.string().min(1).max(120),
  configFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sources: z
    .array(
      z
        .object({
          documentId: z.string().uuid(),
          revisionId: z.string().uuid().nullable(),
          revisionNumber: z.number().int().positive().nullable(),
        })
        .refine((source) => (source.revisionId === null) === (source.revisionNumber === null)),
    )
    .max(4),
});

export type SignedPreviewEvidencePayload = z.infer<typeof signedPreviewEvidencePayloadSchema>;

function signature(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function signAgentTestPreviewEvidence(
  evidence: SignedPreviewEvidencePayload,
  secret: string,
) {
  const sources = [...evidence.sources].sort(
    (left, right) =>
      left.documentId.localeCompare(right.documentId) ||
      (left.revisionId ?? "").localeCompare(right.revisionId ?? "") ||
      (left.revisionNumber ?? 0) - (right.revisionNumber ?? 0),
  );
  const payload = signedPreviewEvidencePayloadSchema.parse({ ...evidence, sources });
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signature(encodedPayload, secret)}`;
}

export function verifyAgentTestPreviewEvidence(token: string, secret: string) {
  if (token.length > 8_000) return null;
  const [encodedPayload, providedSignature, ...extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra.length > 0) return null;

  const expectedSignature = Buffer.from(signature(encodedPayload, secret));
  const actualSignature = Buffer.from(providedSignature);
  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    return signedPreviewEvidencePayloadSchema.safeParse(payload).data ?? null;
  } catch {
    return null;
  }
}
