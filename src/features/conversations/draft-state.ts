export type ConversationComposerDraft = {
  reply: string;
  note: string;
};

export type ConversationComposerDrafts = Record<string, ConversationComposerDraft>;

export type ConversationComposerDraftUpdate = (
  current: ConversationComposerDraft,
) => ConversationComposerDraft;

export type ConversationComposerDraftChange = (update: ConversationComposerDraftUpdate) => void;

export const EMPTY_CONVERSATION_COMPOSER_DRAFT: ConversationComposerDraft = {
  reply: "",
  note: "",
};

export function updateConversationComposerDrafts(
  drafts: ConversationComposerDrafts,
  key: string,
  update: ConversationComposerDraftUpdate,
): ConversationComposerDrafts {
  return {
    ...drafts,
    [key]: update(drafts[key] ?? EMPTY_CONVERSATION_COMPOSER_DRAFT),
  };
}

export function clearSubmittedDraft(currentDraft: string, submittedDraft: string): string {
  return currentDraft === submittedDraft ? "" : currentDraft;
}
