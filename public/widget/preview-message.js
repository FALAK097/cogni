export function createPreviewMessageSender({ state, show, sendMessage }) {
  return async function sendPreviewMessage(message) {
    if (!state.preview || !state.isInitialized || !state.input || typeof message !== "string") {
      return false;
    }

    const text = message.trim();
    if (!text || text.length > 1000 || state.previewMessagePending) return false;

    state.previewMessagePending = true;
    try {
      show();
      state.input.value = text;
      await sendMessage();
      return true;
    } finally {
      state.previewMessagePending = false;
    }
  };
}
