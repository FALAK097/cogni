// Opt-in live provider smoke: synthetic retrieval, no database or external actions.
import { readFile, writeFile, mkdtemp, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { build } from "esbuild";

const { values } = parseArgs({
  options: {
    provider: { type: "string", default: "OPENAI" },
    model: { type: "string", default: "gpt-4o-mini" },
    output: { type: "string" },
  },
});
if (!values.output || !["OPENAI", "GOOGLE"].includes(values.provider)) {
  throw new Error("Pass --output <report.json> and --provider OPENAI or GOOGLE.");
}
process.env.SKIP_ENV_VALIDATION = "1";
const fixtureBytes = await readFile(
  new URL("./fixtures/widget-agent-baseline.json", import.meta.url),
);
const fixture = JSON.parse(fixtureBytes);
const directory = await mkdtemp(join(tmpdir(), "cogni-live-evaluation-"));
const outputFile = join(directory, "agent.mjs");
const report = {
  agentSourceDigest: createHash("sha256")
    .update(await readFile(resolve("src/features/widget/server/widget-agent.ts")))
    .digest("hex"),
  lockfileDigest: createHash("sha256")
    .update(await readFile(resolve("pnpm-lock.yaml")))
    .digest("hex"),
  fixtureVersion: fixture.version,
  fixtureDigest: createHash("sha256").update(fixtureBytes).digest("hex"),
  provider: process.env.WIDGET_MODEL_PROVIDER || values.provider,
  model: process.env.WIDGET_MODEL_NAME || values.model,
  startedAt: new Date().toISOString(),
  scope:
    "Production model streaming with fixed synthetic retrieval and actions disabled. No database, retrieval service, public widget, or authenticated dashboard acceptance. Human review required; no quality score.",
  cases: [],
};
try {
  await symlink(resolve("node_modules"), join(directory, "node_modules"), "dir");
  await build({
    stdin: {
      contents: `
      export { streamWidgetAgent } from "@/features/widget/server/widget-agent";
      export { readWidgetModelText } from "@/features/widget/server/widget-utils";
      export { setSources } from "@/features/knowledge/server/retrieval";
    `,
      resolveDir: process.cwd(),
      sourcefile: "live-evaluation-entry.ts",
    },
    outfile: outputFile,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    alias: { "@": resolve("src") },
    plugins: [
      {
        name: "synthetic-retrieval-and-disabled-actions",
        setup(builder) {
          builder.onResolve(
            {
              filter:
                /^(server-only|@\/features\/knowledge\/server\/retrieval|@\/features\/integrations\/server\/widget-agent-tools)$/,
            },
            ({ path }) => ({ path, namespace: "evaluation" }),
          );
          builder.onLoad({ filter: /.*/, namespace: "evaluation" }, ({ path }) => ({
            contents:
              path === "server-only"
                ? "export {};"
                : path.includes("retrieval")
                  ? "let sources=[]; export function setSources(value){sources=value;} export async function retrieveKnowledgeContext(){return sources;}"
                  : "export function createWidgetAgentTools(){throw new Error('Actions must remain disabled in this evaluation.');}",
            loader: "js",
          }));
        },
      },
    ],
  });
  const { streamWidgetAgent, readWidgetModelText, setSources } = await import(
    pathToFileURL(outputFile).href
  );
  for (const testCase of fixture.cases) {
    setSources(testCase.sources);
    const startedAt = Date.now();
    let completion = null;
    try {
      const result = await streamWidgetAgent({
        config: {
          displayName: "Baseline Support",
          instructions:
            "Answer customer questions accurately from the provided policy. Never claim actions were performed.",
          escalationKeywords: "human,teammate",
          modelProvider: values.provider,
          modelName: values.model,
          workspaceName: "Synthetic baseline",
          workspaceId: "synthetic-baseline",
          latestUserMessage: testCase.prompt,
          memoryContext: "",
          allowActions: false,
          documentIds: null,
          runTimeoutMs: 30_000,
          db: null,
          conversationId: "synthetic-baseline",
          agentRunId: null,
        },
        messages: [
          { id: testCase.id, role: "user", parts: [{ type: "text", text: testCase.prompt }] },
        ],
        onFinish: async (value) => {
          completion = value;
        },
        onError: () => {},
      });
      let text = "";
      for await (const chunk of readWidgetModelText(result.fullStream)) text += chunk;
      await result.waitForCompletion();
      report.cases.push({
        id: testCase.id,
        prompt: testCase.prompt,
        review: testCase.review,
        status: "completed",
        elapsedMs: Date.now() - startedAt,
        text,
        completedText: completion.text,
        sources: completion.sources,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
      });
    } catch {
      // Provider errors may contain request details: retain only the bounded outcome.
      report.cases.push({
        id: testCase.id,
        prompt: testCase.prompt,
        review: testCase.review,
        status: "error",
        elapsedMs: Date.now() - startedAt,
      });
    }
    console.log(`${testCase.id}: ${report.cases.at(-1).status}`);
  }
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(values.output), JSON.stringify(report, null, 2) + "\n");
  await rm(directory, { recursive: true, force: true });
}
if (report.cases.some((entry) => entry.status === "error")) process.exitCode = 1;
