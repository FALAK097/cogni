"use client";

import { useState } from "react";

import { Plus, Send } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackstageChatProps = {
  userName: string;
  agentName: string;
};

const SUGGESTIONS = [
  "Review and improve my agent's instructions",
  "What can you help me with?",
  "How are my credits being used this month?",
  "Audit my agent's configuration for improvements",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function BackstageChat({ userName, agentName }: BackstageChatProps) {
  const [input, setInput] = useState("");
  const firstName = userName.split(" ")[0] ?? userName;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-32">
        <div className="w-full max-w-2xl text-center">
          <p className="text-base text-muted-foreground">
            {getGreeting()}, {firstName}.
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What can I help with?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your {agentName} assistant is ready. Ask anything about your agent, workspace, or setup.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/80 px-4 py-4 backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full text-muted-foreground"
            aria-label="Add attachment"
          >
            <Plus className="size-5" />
          </Button>
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything. Or tell me what you want done."
              rows={1}
              className={cn(
                "w-full resize-none rounded-2xl border border-border bg-muted/30 px-4 py-3 pr-12 text-sm",
                "outline-none transition-colors placeholder:text-muted-foreground",
                "focus:border-primary/50 focus:bg-background",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  setInput("");
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full text-muted-foreground"
            aria-label="Voice input"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </Button>
          <Button
            type="button"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            disabled={!input.trim()}
            aria-label="Send message"
            onClick={() => setInput("")}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
