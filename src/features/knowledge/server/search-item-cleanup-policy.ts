const baseDelayMs = 30_000;
const maxDelayMs = 6 * 60 * 60 * 1_000;
export const searchItemCleanupMaxClaimBatchSize = 5;
export const searchItemCleanupMaxRequestLimit = 100;
export const searchItemCleanupMaxOperationPerRowMs = 20_000;
export const searchItemCleanupClaimLeaseMs = 3 * 60 * 1_000;

export function getSearchItemCleanupClaimLimit(requestedLimit: number) {
  const limit = Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 1;
  return Math.min(searchItemCleanupMaxClaimBatchSize, Math.max(1, limit));
}

export function getSearchItemCleanupRequestLimit(requestedLimit: number) {
  const limit = Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 1;
  return Math.min(searchItemCleanupMaxRequestLimit, Math.max(1, limit));
}

export function shouldPersistSearchItemIdentity({
  revisionStatus,
  currentItemId,
  currentItemKey,
  nextItemId,
}: {
  revisionStatus: "created" | "unchanged";
  currentItemId: string | null | undefined;
  currentItemKey: string | null | undefined;
  nextItemId: string | null;
}) {
  return (
    revisionStatus === "created" ||
    !currentItemKey ||
    (nextItemId !== null && nextItemId !== currentItemId)
  );
}

export function getSearchItemCleanupRetryDelayMs(failedAttempts: number) {
  const attempt = Number.isFinite(failedAttempts) ? Math.max(1, Math.trunc(failedAttempts)) : 1;
  return Math.min(baseDelayMs * 2 ** Math.min(attempt - 1, 10), maxDelayMs);
}
