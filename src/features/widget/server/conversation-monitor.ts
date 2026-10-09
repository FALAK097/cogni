type ConversationReplyState = { aiPaused: boolean; status: string } | null;

export function shouldStopWidgetResponse(state: ConversationReplyState) {
  return !state || state.aiPaused || state.status === "ESCALATED" || state.status === "CLOSED";
}

/** Validate before exposing model text, then poll only for this response's lifetime. */
export async function monitorWidgetConversation({
  readState,
  interrupt,
}: {
  readState: () => Promise<ConversationReplyState>;
  interrupt: () => void;
}): Promise<() => void> {
  let active = true;
  let checking = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => {
    active = false;
    if (timer !== null) clearInterval(timer);
  };
  const check = async () => {
    if (!active || checking) return;
    checking = true;
    try {
      const state = await readState();
      if (active && shouldStopWidgetResponse(state)) {
        stop();
        interrupt();
      }
    } catch {
      if (active) {
        stop();
        interrupt();
      }
    } finally {
      checking = false;
    }
  };

  await check();
  if (active) timer = setInterval(() => void check(), 1_000);
  return stop;
}
