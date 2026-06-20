"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Attachment01Icon,
  Chat01Icon,
  Cancel01Icon,
  SentIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import type { WidgetChatMessage, WidgetSettings } from "@/features/widget/domain";
import { readSessionToken, writeSessionToken } from "@/features/widget/session-storage";

const launcherPixels = {
  SMALL: 48,
  MEDIUM: 56,
  LARGE: 64,
} as const;

function WidgetChatPanel({
  settings,
  sessionToken,
  sessionHostname,
  preview,
  initialMessages,
  embedded,
  parentOrigin,
  launcherSize,
  open,
  updateOpen,
}: {
  settings: WidgetSettings;
  sessionToken: string;
  sessionHostname: string;
  preview: boolean;
  initialMessages: WidgetChatMessage[];
  embedded: boolean;
  parentOrigin?: string;
  launcherSize: number;
  open: boolean;
  updateOpen: (nextOpen: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/widget/${settings.publicKey}/chat`,
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }),
    [sessionToken, settings.publicKey],
  );
  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    messages: initialMessages as UIMessage[],
  });

  const refreshMessages = useCallback(async () => {
    const response = await fetch(`/api/widget/${settings.publicKey}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: sessionToken,
        hostname: sessionHostname,
        preview,
      }),
    });

    if (!response.ok) return;

    const payload = (await response.json()) as { messages: WidgetChatMessage[] };
    setMessages(payload.messages as UIMessage[]);
  }, [preview, sessionHostname, sessionToken, setMessages, settings.publicKey]);

  useEffect(() => {
    if (!open || status !== "ready") return;

    const interval = window.setInterval(() => {
      void refreshMessages();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [open, refreshMessages, status]);

  useEffect(() => {
    if (!embedded || !parentOrigin) return;

    function handleCommand(event: MessageEvent) {
      if (
        event.source !== window.parent ||
        event.origin !== parentOrigin ||
        !event.data ||
        event.data.type !== "widget:command"
      ) {
        return;
      }

      if (event.data.method === "show") updateOpen(true);
      if (event.data.method === "hide") updateOpen(false);
      if (event.data.method === "toggle") updateOpen(!open);
      if (event.data.method === "identify") {
        void fetch(`/api/widget/${settings.publicKey}/identify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event.data.payload),
        });
      }
    }

    window.addEventListener("message", handleCommand);
    window.parent.postMessage({ type: "widget:event", event: "ready" }, parentOrigin);

    return () => window.removeEventListener("message", handleCommand);
  }, [embedded, open, parentOrigin, sessionToken, settings.publicKey, updateOpen]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => updateOpen(true)}
        aria-label={`Open ${settings.displayName}`}
        className="flex items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline-3 focus-visible:outline-offset-2"
        style={{
          width: launcherSize,
          height: launcherSize,
          backgroundColor: settings.primaryColor,
          outlineColor: settings.primaryColor,
        }}
      >
        <HugeiconsIcon icon={Chat01Icon} className="size-6" />
      </button>
    );
  }

  return (
    <section
      aria-label={settings.displayName}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden border shadow-2xl"
      style={{
        width: embedded ? "100%" : settings.panelWidth,
        height: embedded ? "100%" : settings.panelHeight,
        maxWidth: "100%",
        maxHeight: "100%",
        borderRadius: settings.borderRadius,
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
      }}
    >
      <header
        className="flex items-center gap-3 px-4 py-4 text-white"
        style={{ backgroundColor: settings.primaryColor }}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
          {settings.logoUrl ? (
            <span
              aria-hidden="true"
              className="size-7 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${JSON.stringify(settings.logoUrl)})` }}
            />
          ) : (
            <HugeiconsIcon icon={SparklesIcon} className="size-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{settings.displayName}</span>
          <span className="flex items-center gap-1.5 text-xs text-white/75">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            AI assistant
          </span>
        </span>
        {embedded ? (
          <button
            type="button"
            onClick={() => updateOpen(false)}
            aria-label="Close chat"
            className="flex size-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">
        <div
          className="max-w-[86%] rounded-2xl rounded-tl-md px-3.5 py-3 text-sm leading-6"
          style={{
            backgroundColor: `color-mix(in oklab, ${settings.primaryColor} 10%, ${settings.backgroundColor})`,
          }}
        >
          {settings.welcomeMessage}
        </div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "ml-auto max-w-[86%]" : "max-w-[86%]"}
          >
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <div
                  key={`${message.id}-${index}`}
                  className={
                    message.role === "user"
                      ? "rounded-2xl rounded-tr-md px-3.5 py-3 text-sm leading-6 text-white"
                      : "rounded-2xl rounded-tl-md border px-3.5 py-3 text-sm leading-6"
                  }
                  style={
                    message.role === "user"
                      ? { backgroundColor: settings.primaryColor }
                      : { backgroundColor: settings.backgroundColor }
                  }
                >
                  {part.text}
                </div>
              ) : null,
            )}
          </div>
        ))}

        {status === "submitted" ? (
          <div className="flex items-center gap-1.5 text-xs opacity-60">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            Thinking…
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-red-600">
            We could not send that message. Try again.
          </p>
        ) : null}
        {uploadError ? (
          <p role="alert" className="text-xs text-red-600">
            {uploadError}
          </p>
        ) : null}
      </div>

      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const message = input.trim();
          if (!message || status !== "ready") return;
          void sendMessage({ text: message });
          setInput("");
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.docx"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;

              void (async () => {
                setUploadError(null);
                const formData = new FormData();
                formData.append("file", file);
                const response = await fetch(`/api/widget/${settings.publicKey}/upload`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${sessionToken}` },
                  body: formData,
                });

                if (!response.ok) {
                  setUploadError("Could not upload that file.");
                  return;
                }

                await refreshMessages();
              })();
            }}
          />
          <button
            type="button"
            aria-label="Upload file"
            disabled={status !== "ready"}
            onClick={() => fileInputRef.current?.click()}
            className="flex size-8 shrink-0 items-center justify-center rounded-full opacity-60 hover:opacity-100 disabled:opacity-30"
          >
            <HugeiconsIcon icon={Attachment01Icon} className="size-4" />
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            aria-label="Message"
            placeholder={settings.inputPlaceholder}
            className="max-h-24 min-h-8 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || status !== "ready"}
            aria-label="Send message"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
            style={{ backgroundColor: settings.primaryColor }}
          >
            <HugeiconsIcon icon={SentIcon} className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] opacity-45">Powered by widget</p>
      </form>
    </section>
  );
}

export function WidgetShell({
  settings,
  sessionHostname,
  preview = false,
  embedded = false,
  parentOrigin,
}: {
  settings: WidgetSettings;
  sessionHostname: string;
  preview?: boolean;
  embedded?: boolean;
  parentOrigin?: string;
}) {
  const [open, setOpen] = useState(!embedded);
  const [session, setSession] = useState<{
    token: string;
    messages: WidgetChatMessage[];
  } | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const launcherSize = launcherPixels[settings.launcherSize];

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (embedded && parentOrigin) {
        window.parent.postMessage(
          {
            type: "widget:resize",
            open: nextOpen,
            position: settings.position,
            width: nextOpen ? settings.panelWidth : launcherSize,
            height: nextOpen ? settings.panelHeight : launcherSize,
          },
          parentOrigin,
        );
        window.parent.postMessage(
          { type: "widget:event", event: nextOpen ? "open" : "close" },
          parentOrigin,
        );
      }
    },
    [
      embedded,
      launcherSize,
      parentOrigin,
      settings.panelHeight,
      settings.panelWidth,
      settings.position,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      setSessionError(false);

      try {
        const storedToken = readSessionToken(settings.publicKey);
        const response = await fetch(`/api/widget/${settings.publicKey}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(storedToken ? { token: storedToken } : {}),
            hostname: sessionHostname,
            preview,
          }),
        });

        if (!response.ok) {
          throw new Error("Session bootstrap failed.");
        }

        const payload = (await response.json()) as {
          token: string;
          messages: WidgetChatMessage[];
        };

        if (cancelled) return;

        writeSessionToken(settings.publicKey, payload.token);
        setSession({
          token: payload.token,
          messages: payload.messages,
        });
      } catch {
        if (!cancelled) {
          setSessionError(true);
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [preview, sessionHostname, settings.publicKey]);

  if (sessionError) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-center text-sm text-muted-foreground">
        The assistant could not start right now. Refresh the page to try again.
      </main>
    );
  }

  if (!session) {
    if (embedded) {
      return (
        <button
          type="button"
          aria-label={`Open ${settings.displayName}`}
          aria-busy="true"
          disabled
          className="flex items-center justify-center rounded-full text-white opacity-80 shadow-lg"
          style={{
            width: launcherSize,
            height: launcherSize,
            backgroundColor: settings.primaryColor,
          }}
        >
          <HugeiconsIcon icon={Chat01Icon} className="size-6 animate-pulse" />
        </button>
      );
    }

    return (
      <div
        className="flex items-center justify-center border text-sm text-muted-foreground"
        style={{
          width: settings.panelWidth,
          height: settings.panelHeight,
          borderRadius: settings.borderRadius,
        }}
      >
        Loading assistant…
      </div>
    );
  }

  return (
    <WidgetChatPanel
      key={session.token}
      settings={settings}
      sessionToken={session.token}
      sessionHostname={sessionHostname}
      preview={preview}
      initialMessages={session.messages}
      embedded={embedded}
      parentOrigin={parentOrigin}
      launcherSize={launcherSize}
      open={open}
      updateOpen={updateOpen}
    />
  );
}
