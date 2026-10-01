import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/lib/workflows/progression.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const workflow = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

const steps = [
  { id: "first", position: 0, status: "COMPLETED" },
  { id: "second", position: 1, status: "PENDING" },
  { id: "third", position: 2, status: "PENDING" },
];

test("workflow progression selects the earliest pending step", () => {
  assert.deepEqual(workflow.getWorkflowProgression(steps), {
    kind: "ready",
    step: steps[1],
  });
});

test("workflow progression rejects skipping a pending step", () => {
  assert.deepEqual(workflow.getWorkflowProgression(steps, "third"), {
    kind: "out-of-order",
    step: steps[1],
  });
});

test("workflow progression blocks while an earlier step is unresolved", () => {
  assert.equal(
    workflow.getWorkflowProgression([
      { id: "approval", position: 0, status: "WAITING_APPROVAL" },
      { id: "next", position: 1, status: "PENDING" },
    ]).kind,
    "blocked",
  );
});

test("workflow progression completes only when every step is complete", () => {
  assert.deepEqual(
    workflow.getWorkflowProgression([
      { id: "first", position: 0, status: "COMPLETED" },
      { id: "second", position: 1, status: "COMPLETED" },
    ]),
    { kind: "complete" },
  );
});
