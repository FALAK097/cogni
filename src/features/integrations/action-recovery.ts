export type ActionExecutionDecision =
  | "START"
  | "RETURN_COMPLETED"
  | "BLOCK_RUNNING"
  | "RETRY_FAILED"
  | "RETRY_NOT_SENT"
  | "RECONCILE_UNKNOWN";

function hasProviderIdempotency(provider: string, actionType?: string) {
  if (provider === "RESEND") return true;
  if (provider !== "INTERNAL") return false;
  // Appending a note is an insert, so a lost acknowledgement can duplicate it.
  return actionType !== "conversation.note";
}

export function getActionExecutionDecision(
  status: string | null | undefined,
  provider: string,
  actionType?: string,
): ActionExecutionDecision {
  if (!status) return "START";
  if (status === "COMPLETED") return "RETURN_COMPLETED";
  if (status === "RUNNING" || status === "PENDING") return "BLOCK_RUNNING";
  if (status === "UNKNOWN") return "RECONCILE_UNKNOWN";
  if (status === "NOT_SENT") return "RETRY_NOT_SENT";
  if (status === "FAILED") {
    return hasProviderIdempotency(provider, actionType) ? "RETRY_FAILED" : "RECONCILE_UNKNOWN";
  }
  return "RECONCILE_UNKNOWN";
}

export function getActionStatusForDisplay(status: string, provider: string, actionType?: string) {
  if (status === "FAILED" && !hasProviderIdempotency(provider, actionType)) return "UNKNOWN";
  return status;
}

export const ACTION_OUTCOME_UNKNOWN_MESSAGE =
  "Cogni could not confirm whether this action completed. Check the conversation or connected account before trying again; it will not be replayed automatically.";
