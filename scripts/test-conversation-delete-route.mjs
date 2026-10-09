import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  role: "OWNER",
  workspaceId: "workspace-current",
  conversationId: "conversation-target",
  visitorSessionId: "visitor-session-shared",
  queryCalls: 0,
  deletes: [],
  events: [],
};
globalThis.__conversationDeleteRouteTest = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => {
    const state = globalThis.__conversationDeleteRouteTest;
    return {
      workspace: { id: state.workspaceId },
      membership: { role: state.role },
      db: {
        query: { conversation: { findFirst: async () => {
          state.queryCalls += 1;
          return { id: state.conversationId, visitorSessionId: state.visitorSessionId };
        } } },
        delete: (table) => ({
          where: (condition) => ({
            returning: async () => {
              state.deletes.push({ table: table.name, condition });
              return [{ id: state.conversationId }];
            },
          }),
        }),
        transaction: async (operation) => operation(state.db),
      },
    };
  };`,
  "@/lib/auth/permissions": `export const canManageWorkspace = (role) => role === "OWNER";`,
  "@/features/conversations/server/queries": `export const appendTeamConversationMessage = async () => false; export const getConversation = async () => null; export const markConversationAsRead = async () => {};`,
  "@/features/conversations/server/conversation-service": `export const setConversationStatus = async () => null; export const recordConversationEvent = async (_db, ...event) => { globalThis.__conversationDeleteRouteTest.events.push(event); }; export const updateConversationState = async () => null;`,
  "@/lib/db/client": `export const runDbWriteOperation = async (db, operation) => operation(db);`,
  "@/features/contacts/server/contact-tags": `export const parseContactTags = () => [];`,
  "@/features/conversations/server/labels": `export const parseConversationLabels = () => [];`,
  "@/lib/storage/index": `export const uploadPublicPath = (value) => value;`,
  "@/features/integrations/server/chat-sdk": `export const isChatSdkChannel = () => false; export const postChannelReply = async () => {};`,
  "@/lib/db/schema": `export const conversation = { name: "conversation", id: "conversation.id", workspaceId: "conversation.workspaceId", visitorSessionId: "conversation.visitorSessionId" }; export const visitorSession = { name: "visitorSession", id: "visitorSession.id" };`,
  "drizzle-orm": `export const eq = (column, value) => ({ op: "eq", column, value }); export const and = (...conditions) => ({ op: "and", conditions }); export const inArray = (column, values) => ({ op: "inArray", column, values }); export const ne = (column, value) => ({ op: "ne", column, value });`,
};

async function loadRoute(entryPoint) {
  const compiled = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    alias: { "@": resolve("src") },
    plugins: [
      {
        name: "conversation-delete-route-test",
        setup(buildContext) {
          buildContext.onResolve({ filter: /^(next\/server|drizzle-orm|@\/.*)$/ }, (args) =>
            args.path in stubs
              ? { path: args.path, namespace: "conversation-delete-route-test" }
              : undefined,
          );
          buildContext.onLoad(
            { filter: /.*/, namespace: "conversation-delete-route-test" },
            (args) => ({ contents: stubs[args.path], loader: "js" }),
          );
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );
}

const route = await loadRoute("src/app/api/dashboard/conversations/[conversation_id]/route.ts");

function resetState(role = "OWNER") {
  state.role = role;
  state.queryCalls = 0;
  state.deletes = [];
  state.events = [];
}

const context = { params: Promise.resolve({ conversation_id: state.conversationId }) };

test("only workspace owners can delete conversations, with no database lookup for members", async () => {
  resetState("MEMBER");

  const response = await route.DELETE(new Request("https://cogni.test"), context);

  assert.equal(response.status, 403);
  assert.equal(state.queryCalls, 0);
  assert.deepEqual(state.deletes, []);
});

test("deleting a conversation removes only that workspace conversation and preserves its visitor session", async () => {
  resetState("OWNER");

  const response = await route.DELETE(new Request("https://cogni.test"), context);

  assert.equal(response.status, 200);
  assert.equal(
    state.queryCalls,
    0,
    "deletion should be one scoped statement, not a read-then-delete",
  );
  assert.deepEqual(state.deletes, [
    {
      table: "conversation",
      condition: {
        op: "and",
        conditions: [
          { op: "eq", column: "conversation.id", value: state.conversationId },
          { op: "eq", column: "conversation.workspaceId", value: state.workspaceId },
        ],
      },
    },
  ]);
  assert.deepEqual(state.events, [[state.workspaceId, state.conversationId, "state"]]);
});
