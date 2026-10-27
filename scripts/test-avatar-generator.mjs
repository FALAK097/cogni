import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/lib/avatar-generator.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const avatars = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("avatar identity is stable across whitespace, case, and Unicode normalization", () => {
  assert.equal(avatars.generateAvatarUrl("  Alex  "), avatars.generateAvatarUrl("alex"));
  assert.equal(avatars.generateAvatarUrl("Amélie"), avatars.generateAvatarUrl("Ame\u0301lie"));
});

test("different identities receive varied avatars without remote image requests", () => {
  const values = ["alex", "maya", "jordan", "visitor-1", "visitor-2"].map((seed) =>
    avatars.generateUserAvatarUrl(seed),
  );
  assert.equal(new Set(values).size, values.length);
  for (const value of values) {
    assert.match(value, /^data:image\/svg\+xml,/);
    const svg = decodeURIComponent(value.slice(value.indexOf(",") + 1));
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /<script|<foreignObject|<image|(?:href|src)=['"]https?:\/\//);
  }
});

test("identity seeds are neither echoed into the SVG nor sent in a remote URL", () => {
  const avatar = avatars.generateUserAvatarUrl("private.customer@example.com");
  assert.doesNotMatch(decodeURIComponent(avatar), /private.customer|example.com/);
});
