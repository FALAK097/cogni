import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/transcript-timeline.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { mergeTranscriptMessages } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("internal notes appear in chronological order and preserve the public message array", () => {
  const messages = [
    { id: "visitor-1", timestamp: "2026-09-29T10:00:00.000Z", content: "Question" },
    { id: "visitor-2", timestamp: "2026-09-29T10:10:00.000Z", content: "Follow up" },
  ];
  const notes = [
    {
      id: "note-1",
      body: "Check the refund policy before replying.",
      createdAt: "2026-09-29T10:05:00.000Z",
      authorName: "Sam",
    },
  ];

  const timeline = mergeTranscriptMessages(messages, notes);

  assert.deepEqual(
    timeline.map((message) => message.id),
    ["visitor-1", "internal-note:note-1", "visitor-2"],
  );
  assert.deepEqual(
    messages.map((message) => message.id),
    ["visitor-1", "visitor-2"],
  );
  assert.equal(timeline[1].authorType, "TEAM");
  assert.equal(timeline[1].authorName, "Sam");
  assert.equal(timeline[1].visibility, "INTERNAL");
  assert.equal(timeline[1].isInternal, true);
});

test("same-time entries keep deterministic source order", () => {
  const timeline = mergeTranscriptMessages(
    [
      { id: "message-b", timestamp: "2026-09-29T10:00:00.000Z" },
      { id: "message-a", timestamp: "2026-09-29T10:00:00.000Z" },
    ],
    [
      {
        id: "note-b",
        body: "Second note",
        createdAt: "2026-09-29T10:00:00.000Z",
        authorName: "Team",
      },
      {
        id: "note-a",
        body: "Third note",
        createdAt: "2026-09-29T10:00:00.000Z",
        authorName: "Team",
      },
    ],
  );

  assert.deepEqual(
    timeline.map((message) => message.id),
    ["message-b", "message-a", "internal-note:note-b", "internal-note:note-a"],
  );
});
