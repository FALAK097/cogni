import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { readWidgetTextStream } from "../public/widget/sse.js";

const compiled = await build({
  stdin: {
    contents: `export * from "./src/features/widget/server/conversation-monitor";
      export { createWidgetSseStream, interruptWidgetTextStream } from "./src/features/widget/server/widget-utils";`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "server-only-stub",
      setup(context) {
        context.onResolve({ filter: /^server-only$/ }, () => ({
          path: "empty",
          namespace: "stub",
        }));
        context.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "" }));
      },
    },
  ],
});
const { monitorWidgetConversation, createWidgetSseStream, interruptWidgetTextStream } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

for (const state of [
  null,
  { aiPaused: true, status: "ASSIGNED" },
  { aiPaused: false, status: "ESCALATED" },
  { aiPaused: false, status: "CLOSED" },
]) {
  test(`initial ${state?.status ?? "missing"} state interrupts before exposing model text`, async () => {
    const abort = new AbortController();
    const stop = await monitorWidgetConversation({
      readState: async () => state,
      interrupt: () => abort.abort(),
    });
    assert.equal(abort.signal.aborted, true);
    let displayed = "";
    let completed = false;
    await assert.rejects(
      readWidgetTextStream(
        createWidgetSseStream(
          interruptWidgetTextStream(
            (async function* () {
              yield "Must not display";
            })(),
            abort.signal,
          ),
          {
            onComplete: async () => {
              completed = true;
            },
            onFinally: stop,
          },
        ),
        (text) => {
          displayed = text;
        },
      ),
      /could not complete/,
    );
    assert.equal(displayed, "");
    assert.equal(completed, false);
  });
}

test("monitor waits for the initial database read before returning", async () => {
  const gate = Promise.withResolvers();
  let returned = false;
  const setup = monitorWidgetConversation({
    readState: () => gate.promise,
    interrupt: () => {},
  }).then((stop) => {
    returned = true;
    return stop;
  });
  await flush();
  assert.equal(returned, false);
  gate.resolve({ aiPaused: false, status: "OPEN" });
  (await setup)();
});

for (const status of ["CLOSED", "ESCALATED", "ASSIGNED"]) {
  test(`mid-stream ${status} transition interrupts once and removes the timer`, async (context) => {
    context.mock.timers.enable({ apis: ["setInterval"] });
    let state = { aiPaused: false, status: "OPEN" };
    let interrupts = 0;
    let reads = 0;
    const stop = await monitorWidgetConversation({
      readState: async () => {
        reads += 1;
        return state;
      },
      interrupt: () => {
        interrupts += 1;
      },
    });
    state = { aiPaused: status === "ASSIGNED", status };
    context.mock.timers.tick(1_000);
    await flush();
    assert.equal(interrupts, 1);
    context.mock.timers.tick(5_000);
    await flush();
    assert.equal(interrupts, 1);
    assert.equal(reads, 2);
    stop();
  });
}

test("database failure interrupts without leaking model text", async () => {
  let interrupts = 0;
  const stop = await monitorWidgetConversation({
    readState: async () => {
      throw new Error("Database unavailable");
    },
    interrupt: () => {
      interrupts += 1;
    },
  });
  assert.equal(interrupts, 1);
  stop();
});

test("polls do not overlap and stopped responses ignore an in-flight read", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const gate = Promise.withResolvers();
  let reads = 0;
  let interrupts = 0;
  const stop = await monitorWidgetConversation({
    readState: async () => {
      reads += 1;
      return reads === 1 ? { aiPaused: false, status: "OPEN" } : gate.promise;
    },
    interrupt: () => {
      interrupts += 1;
    },
  });
  context.mock.timers.tick(3_000);
  assert.equal(reads, 2);
  stop();
  gate.resolve({ aiPaused: true, status: "ASSIGNED" });
  await flush();
  context.mock.timers.tick(3_000);
  assert.equal(reads, 2);
  assert.equal(interrupts, 0);
});
