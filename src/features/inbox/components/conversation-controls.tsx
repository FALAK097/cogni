import { Button } from "@/components/ui/button";
import {
  markConversationReadAction,
  pauseConversationAiAction,
  resumeConversationAiAction,
} from "@/features/inbox/actions";

export function ConversationControls({
  conversationId,
  aiPaused,
}: {
  conversationId: string;
  aiPaused: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={markConversationReadAction}>
        <input type="hidden" name="conversationId" value={conversationId} />
        <Button type="submit" variant="outline" size="sm">
          Mark read
        </Button>
      </form>
      {aiPaused ? (
        <form action={resumeConversationAiAction}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <Button type="submit" variant="outline" size="sm">
            Resume AI
          </Button>
        </form>
      ) : (
        <form action={pauseConversationAiAction}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <Button type="submit" variant="outline" size="sm">
            Pause AI
          </Button>
        </form>
      )}
    </div>
  );
}
