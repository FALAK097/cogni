export function clearSubmittedDraft(currentDraft: string, submittedDraft: string): string {
  return currentDraft === submittedDraft ? "" : currentDraft;
}
