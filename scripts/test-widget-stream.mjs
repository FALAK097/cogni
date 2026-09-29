import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { streamText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { readWidgetTextStream } from "../public/widget/sse.js";

const compiled = await build({
  entryPoints: ["src/features/widget/server/widget-utils.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "server-only-test-boundary",
      setup(builder) {
        builder.onResolve({ filter: /^server-only$/ }, () => ({
          path: "empty",
          namespace: "test",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: "" }));
      },
    },
  ],
});
const { createWidgetSseStream, readWidgetModelText, createWidgetCompletion } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const encoder = new TextEncoder();

async function* textChunks(chunks) {
  yield* chunks;
}

function transport(text, width) {
  const bytes = encoder.encode(text);
  return new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += width) {
        controller.enqueue(bytes.slice(offset, offset + width));
      }
      controller.close();
    },
  });
}

test("server and client preserve multiline, spaces and UTF-8 across network boundaries", async () => {
  let completions = 0;
  const expected = "Hello 🌍\n\n  Refunds: 14 days.\n";
  const stream = createWidgetSseStream(textChunks(["Hello 🌍\n", "\n  Refunds: 14 days.\n"]), {
    onComplete: async () => {
      completions++;
    },
  });
  const frames = await new Response(stream).text();
  for (const width of [1, 2, 7, 1024]) {
    const updates = [];
    const result = await readWidgetTextStream(transport(frames, width), (text) =>
      updates.push(text),
    );
    assert.equal(result, expected);
    assert.equal(updates.at(-1), expected);
  }
  assert.equal(completions, 1);
});

test("empty model stream fails and never calls the success callback", async () => {
  let completed = false;
  const stream = createWidgetSseStream(textChunks([]), {
    onComplete: async () => {
      completed = true;
    },
  });
  await assert.rejects(
    readWidgetTextStream(stream, () => {}),
    /could not complete/,
  );
  assert.equal(completed, false);
});

test("empty DONE from an older server is rejected", async () => {
  await assert.rejects(
    readWidgetTextStream(transport("data: [DONE]\n\n", 1), () => {}),
    /empty/,
  );
});

test("interrupted responses never become completed messages", async () => {
  let partial = "";
  await assert.rejects(
    readWidgetTextStream(transport("data: partial\n\n", 3), (text) => {
      partial = text;
    }),
    /before completion/,
  );
  assert.equal(partial, "partial");
});

test("model stream failure emits an error after partial text", async () => {
  async function* failure() {
    yield "Partial";
    throw new Error("Provider unavailable");
  }
  await assert.rejects(
    readWidgetTextStream(createWidgetSseStream(failure()), () => {}),
    /could not complete/,
  );
});

test("installed SDK provider errors after text never become successful SSE completion", async () => {
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "answer" });
          controller.enqueue({ type: "text-delta", id: "answer", delta: "Partial answer" });
          controller.enqueue({ type: "error", error: new Error("Provider failed") });
          controller.close();
        },
      }),
    }),
  });
  const result = streamText({ model, prompt: "Test", onError: () => {} });
  let partial = "";
  let completed = false;
  await assert.rejects(
    readWidgetTextStream(
      createWidgetSseStream(readWidgetModelText(result.fullStream), {
        onComplete: async () => {
          completed = true;
        },
      }),
      (text) => {
        partial = text;
      },
    ),
    /could not complete/,
  );
  assert.equal(partial, "Partial answer");
  assert.equal(completed, false);
});

test("installed SDK abort after text never becomes successful SSE completion", async () => {
  const abortController = new AbortController();
  let providerController = null;
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          providerController = controller;
          controller.enqueue({ type: "text-start", id: "answer" });
          controller.enqueue({ type: "text-delta", id: "answer", delta: "Partial answer" });
        },
      }),
    }),
  });
  const result = streamText({
    model,
    prompt: "Test",
    abortSignal: abortController.signal,
    onAbort: () => {},
  });
  let partial = "";
  let completed = false;
  await assert.rejects(
    readWidgetTextStream(
      createWidgetSseStream(readWidgetModelText(result.fullStream), {
        onComplete: async () => {
          completed = true;
        },
      }),
      (text) => {
        partial = text;
        abortController.abort();
        providerController.error(new DOMException("Aborted", "AbortError"));
      },
    ),
    /could not complete/,
  );
  assert.equal(partial, "Partial answer");
  assert.equal(completed, false);
});

test("model event adapter requires an explicit successful finish", async () => {
  const delta = { type: "text-delta", text: "Complete answer" };
  const result = await readWidgetTextStream(
    createWidgetSseStream(
      readWidgetModelText(textChunks([delta, { type: "finish", finishReason: "stop" }])),
    ),
    () => {},
  );
  assert.equal(result, "Complete answer");
  await assert.rejects(
    readWidgetTextStream(createWidgetSseStream(readWidgetModelText(textChunks([delta]))), () => {}),
    /could not complete/,
  );
});

for (const persistenceFails of [false, true]) {
  test(`installed SDK completion waits for persistence (${persistenceFails ? "failed" : "saved"})`, async () => {
    const completion = createWidgetCompletion();
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            for (const part of [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "answer" },
              { type: "text-delta", id: "answer", delta: "Complete answer" },
              { type: "text-end", id: "answer" },
              {
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
              },
            ])
              controller.enqueue(part);
            controller.close();
          },
        }),
      }),
    });
    const result = streamText({
      model,
      prompt: "Test",
      onEnd: async () => {
        // Represent the caller's asynchronous save, then report its outcome.
        await Promise.resolve();
        if (persistenceFails) completion.fail(new Error("Persistence failed"));
        else completion.succeed();
      },
    });
    const response = readWidgetTextStream(
      createWidgetSseStream(readWidgetModelText(result.fullStream), {
        onComplete: completion.waitForCompletion,
      }),
      () => {},
    );
    if (persistenceFails) await assert.rejects(response, /could not complete/);
    else assert.equal(await response, "Complete answer");
  });
}
