import "server-only";

export function matchesEscalationKeywords(message: string, keywords: string) {
  const normalized = message.toLowerCase();
  return keywords
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .some((keyword) => normalized.includes(keyword));
}

export const handoffReply =
  "I'm connecting you with a teammate who can help. They'll reply here shortly.";
