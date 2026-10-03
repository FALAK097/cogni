import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/snooze-schedule.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const schedule = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { getSnoozeUntil } = schedule;

test("relative snooze choices preserve exact durations", () => {
  const now = new Date("2026-10-02T10:30:00.000Z");
  assert.equal(getSnoozeUntil("one-hour", "Asia/Kolkata", now), "2026-10-02T11:30:00.000Z");
  assert.equal(
    getSnoozeUntil("four-hours", "America/Los_Angeles", now),
    "2026-10-02T14:30:00.000Z",
  );
});

test("tomorrow morning respects daylight-saving transitions", () => {
  const beforeSpringForward = new Date("2026-03-08T05:00:00.000Z");
  assert.equal(
    getSnoozeUntil("tomorrow-morning", "America/New_York", beforeSpringForward),
    "2026-03-09T13:00:00.000Z",
  );
});

test("next Monday always means the upcoming Monday in workspace time", () => {
  const thursday = new Date("2026-10-01T06:00:00.000Z");
  const monday = new Date("2026-10-05T15:00:00.000Z");
  assert.equal(getSnoozeUntil("next-monday", "Asia/Kolkata", thursday), "2026-10-05T03:30:00.000Z");
  assert.equal(
    getSnoozeUntil("next-monday", "America/New_York", monday),
    "2026-10-12T13:00:00.000Z",
  );
});

test("invalid legacy timezones safely fall back to UTC", () => {
  assert.equal(
    getSnoozeUntil("tomorrow-morning", "invalid/timezone", new Date("2026-10-02T10:30:00.000Z")),
    "2026-10-03T09:00:00.000Z",
  );
});
