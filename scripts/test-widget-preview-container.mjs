import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/widget/wait-for-preview-container.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { waitForPreviewContainer } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("missing preview container rejects after the frame limit", async () => {
  const frames = [];
  const pendingContainer = waitForPreviewContainer(
    () => null,
    (callback) => {
      frames.push(callback);
      return frames.length;
    },
    4,
  );

  while (frames.length > 0) {
    frames.shift()(0);
  }

  await assert.rejects(pendingContainer, {
    message: "Widget preview container was not created",
  });
  assert.equal(frames.length, 0);
});

test("an existing preview container resolves without scheduling a frame", async () => {
  const container = {};
  const result = await waitForPreviewContainer(
    () => container,
    () => {
      throw new Error("The animation frame scheduler should not be used");
    },
  );

  assert.equal(result, container);
});

test("a container created during the next frame resolves normally", async () => {
  const container = {};
  let exists = false;
  const result = await waitForPreviewContainer(
    () => (exists ? container : null),
    (callback) => {
      exists = true;
      callback(0);
      return 1;
    },
  );

  assert.equal(result, container);
});
