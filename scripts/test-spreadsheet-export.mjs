import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/spreadsheet-export.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const moduleUrl =
  "data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64");
const { escapeCsvCell, escapeSpreadsheetHtmlCell } = await import(moduleUrl);

test("CSV exports neutralize visitor text that spreadsheet apps treat as formulas", () => {
  for (const value of ["=HYPERLINK(1)", "+SUM(A1:A2)", "-1+2", "@SUM(A1:A2)", "\t=1+1"]) {
    assert.equal(escapeCsvCell(value), "'" + value);
  }
  assert.equal(escapeCsvCell("\r=1+1"), '"\'\r=1+1"');
});

test("CSV cells quote delimiters, quotes, line feeds, and carriage returns", () => {
  assert.equal(escapeCsvCell("first\rsecond"), '"first\rsecond"');
  assert.equal(escapeCsvCell("first\nsecond"), '"first\nsecond"');
  assert.equal(escapeCsvCell('say "hello", friend'), '"say ""hello"", friend"');
});

test("Excel HTML cells neutralize formulas and escape markup", () => {
  assert.equal(escapeSpreadsheetHtmlCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(escapeSpreadsheetHtmlCell("<script>&"), "&lt;script&gt;&amp;");
});
