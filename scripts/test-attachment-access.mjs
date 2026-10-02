import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

let conversationVisitorSessionId = "visitor-1";
let objectReads = 0;
const operators = {
  eq: (field, value) => ({ field, value }),
  gt: (field, value) => ({ field, value, operator: "gt" }),
  and: (...conditions) => conditions,
};
const matchingConditions = (where, fields) => where(fields, operators).flat(Infinity);
const query = {
  attachment: {
    async findFirst({ where }) {
      where({ storageKey: "attachment.storageKey" }, operators);
      return {
        filename: "receipt.pdf",
        mimeType: "application/pdf",
        workspaceId: "workspace-1",
        conversationId: "conversation-1",
      };
    },
  },
  visitorSession: {
    async findFirst({ where }) {
      const conditions = matchingConditions(where, {
        token: "visitor_session.token",
        expiresAt: "visitor_session.expiresAt",
      });
      assert.ok(
        conditions.some(
          (condition) =>
            condition.field === "visitor_session.token" && condition.value === "valid-token",
        ),
      );
      return {
        id: "visitor-1",
        widget: { workspaceId: "workspace-1" },
      };
    },
  },
  conversation: {
    async findFirst({ where }) {
      const conditions = matchingConditions(where, {
        id: "conversation.id",
        workspaceId: "conversation.workspaceId",
        visitorSessionId: "conversation.visitorSessionId",
      });
      const sessionFilter = conditions.find(
        (condition) => condition.field === "conversation.visitorSessionId",
      );
      if (sessionFilter && sessionFilter.value !== conversationVisitorSessionId) return undefined;
      if (conversationVisitorSessionId !== "visitor-1") {
        return { workspaceId: "workspace-1", visitorSessionId: conversationVisitorSessionId };
      }
      return { workspaceId: "workspace-1", visitorSessionId: "visitor-1" };
    },
  },
};
globalThis.__attachmentAccessTest = {
  getDb: () => ({ query }),
  requireDashboardContext: async () => {
    throw new Error("No dashboard session in widget test.");
  },
  readObject: async () => {
    objectReads += 1;
    return Uint8Array.from([1, 2, 3]);
  },
};

const compiled = await build({
  entryPoints: ["src/app/api/files/[...storageKey]/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  packages: "external",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "attachment-route-test-dependencies",
      setup(buildContext) {
        const stubs = {
          "@/lib/db/client":
            "export const getDb = () => globalThis.__attachmentAccessTest.getDb();",
          "@/lib/auth/dashboard-context":
            "export const requireDashboardContext = () => globalThis.__attachmentAccessTest.requireDashboardContext();",
          "@/lib/storage/index":
            "export const readObject = (...args) => globalThis.__attachmentAccessTest.readObject(...args);",
        };
        buildContext.onResolve(
          { filter: /^@\/lib\/(db\/client|auth\/dashboard-context|storage\/index)$/ },
          (args) => ({
            path: args.path,
            namespace: "attachment-route-test",
          }),
        );
        buildContext.onLoad(
          { filter: /^@\/lib\//, namespace: "attachment-route-test" },
          (args) => ({
            contents: stubs[args.path],
            loader: "js",
          }),
        );
        buildContext.onResolve({ filter: /^drizzle-orm$/ }, () => ({
          path: "drizzle-orm",
          namespace: "attachment-route-test",
        }));
        buildContext.onLoad(
          { filter: /^drizzle-orm$/, namespace: "attachment-route-test" },
          () => ({
            contents:
              "export const eq = (field, value) => ({ field, value }); export const gt = (field, value) => ({ field, value }); export const and = (...conditions) => conditions;",
            loader: "js",
          }),
        );
      },
    },
  ],
});
const route = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

async function getAttachment() {
  return route.GET(
    new Request("https://cogni.test/api/files/workspace-1/receipt.pdf", {
      headers: { authorization: "Bearer valid-token" },
    }),
    { params: Promise.resolve({ storageKey: ["workspace-1", "receipt.pdf"] }) },
  );
}

test("visitor can access an attachment from their own conversation", async () => {
  conversationVisitorSessionId = "visitor-1";
  objectReads = 0;
  const response = await getAttachment();
  assert.equal(response.status, 200);
  assert.equal(objectReads, 1);
});

test("visitor cannot access another visitor's attachment in the same workspace", async () => {
  conversationVisitorSessionId = "visitor-2";
  objectReads = 0;
  const response = await getAttachment();
  assert.equal(response.status, 403);
  assert.equal(objectReads, 0);
});
