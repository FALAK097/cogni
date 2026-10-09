import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {};
globalThis.__conversationAssignmentRouteTest = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = () => globalThis.__conversationAssignmentRouteTest.context();`,
  "@/features/conversations/server/queries": `export const appendTeamConversationMessage = async () => false; export const getConversation = async () => null; export const markConversationAsRead = async () => false;`,
  "@/features/conversations/server/conversation-service": `export const setConversationStatus = async () => null; export const recordConversationEvent = async () => {}; export const updateConversationState = async ({ db, workspaceId, conversationId, changes }) => { globalThis.__conversationAssignmentRouteTest.stateUpdates.push({ workspaceId, conversationId }); const [row] = await db.update({}).set(changes).where({}).returning(); return row ?? null; };`,
  "@/lib/db/client": `export const runDbWriteOperation = async (db, operation) => operation(db);`,
  "@/lib/auth/permissions": `export const canManageWorkspace = () => true;`,
  "@/features/contacts/server/contact-tags": `export const parseContactTags = () => [];`,
  "@/features/conversations/server/labels": `export const parseConversationLabels = () => [];`,
  "@/lib/storage/index": `export const uploadPublicPath = () => "";`,
  "@/features/integrations/server/chat-sdk": `export const isChatSdkChannel = () => false; export const postChannelReply = async () => {};`,
  "@/lib/db/schema": `export const conversation = { id: "conversation.id", workspaceId: "conversation.workspaceId", status: "conversation.status" };`,
  "drizzle-orm": `export const eq = (field, value) => ({ field, value }); export const and = (...conditions) => conditions; export const inArray = () => ({}); export const ne = (field, value) => ({ field, value, not: true });`,
};

const compiled = await build({
  entryPoints: ["src/app/api/dashboard/conversations/[conversation_id]/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "conversation-assignment-route-test",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^(next\/server|drizzle-orm|@\/.*)$/ }, (args) =>
          args.path in stubs
            ? { path: args.path, namespace: "conversation-assignment-route-test" }
            : undefined,
        );
        buildContext.onLoad(
          { filter: /.*/, namespace: "conversation-assignment-route-test" },
          (args) => ({ contents: stubs[args.path], loader: "js" }),
        );
      },
    },
  ],
});

const route = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function matches(record, expression) {
  const conditions = Array.isArray(expression) ? expression.flat(Infinity) : [expression];
  return conditions.every((condition) => {
    if (!condition || typeof condition !== "object" || !("field" in condition)) return false;
    const field = condition.field.split(".").at(-1);
    return condition.not ? record[field] !== condition.value : record[field] === condition.value;
  });
}

function reset({ conversation = {}, members = [] } = {}) {
  Object.assign(state, {
    workspace: { id: "workspace-active" },
    membership: { id: "agent-1", role: "MEMBER" },
    conversation: {
      id: "conversation-1",
      workspaceId: "workspace-active",
      status: "OPEN",
      assignedMemberId: null,
      aiPaused: false,
      snoozedUntil: null,
      ...conversation,
    },
    members,
    memberLookupExpressions: [],
    updates: [],
    stateUpdates: [],
  });

  state.db = {
    query: {
      conversation: {
        findFirst: async ({ where }) => {
          const expression = where(
            { id: "conversation.id", workspaceId: "conversation.workspaceId" },
            { eq: stubsEq, and: stubsAnd },
          );
          return matches(state.conversation, expression) ? state.conversation : null;
        },
      },
      workspaceMember: {
        findFirst: async ({ where }) => {
          const expression = where(
            { id: "workspaceMember.id", workspaceId: "workspaceMember.workspaceId" },
            { eq: stubsEq, and: stubsAnd },
          );
          state.memberLookupExpressions.push(expression);
          return state.members.find((member) => matches(member, expression) === true) ?? null;
        },
      },
    },
    update: () => ({
      set: (values) => {
        state.updates.push(values);
        return {
          where: () => ({
            returning: async () => [{ id: state.conversation.id }],
          }),
        };
      },
    }),
  };
  state.context = async () => ({
    db: state.db,
    workspace: state.workspace,
    membership: state.membership,
    session: { user: { id: "user-1" } },
  });
}

const stubsEq = (field, value) => ({ field, value });
const stubsAnd = (...conditions) => conditions;

function patch(body, conversationId = "conversation-1") {
  return route.PATCH(
    new Request(`https://cogni.test/api/dashboard/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ conversation_id: conversationId }) },
  );
}

test("assigning an active-workspace member updates ownership without pausing AI", async () => {
  reset({ members: [{ id: "member-local", workspaceId: "workspace-active" }] });

  const response = await patch({ action: "assign_to_member", assignedMemberId: "member-local" });

  assert.equal(response.status, 200);
  assert.deepEqual(
    state.updates[0] && {
      assignedMemberId: state.updates[0].assignedMemberId,
      status: state.updates[0].status,
      snoozedUntil: state.updates[0].snoozedUntil,
      pausesAi: Object.hasOwn(state.updates[0], "aiPaused"),
    },
    {
      assignedMemberId: "member-local",
      status: "ASSIGNED",
      snoozedUntil: null,
      pausesAi: false,
    },
  );
  assert.ok(
    matches(
      { id: "member-local", workspaceId: "workspace-active" },
      state.memberLookupExpressions[0],
    ),
  );
  assert.deepEqual(state.stateUpdates, [
    { workspaceId: "workspace-active", conversationId: "conversation-1" },
  ]);
});

test("a foreign-workspace assignee is rejected before any state change", async () => {
  reset({ members: [{ id: "member-foreign", workspaceId: "workspace-foreign" }] });

  const response = await patch({ action: "assign_to_member", assignedMemberId: "member-foreign" });

  assert.equal(response.status, 404);
  assert.equal(state.memberLookupExpressions.length, 1);
  assert.equal(state.updates.length, 0);
  assert.equal(state.stateUpdates.length, 0);
});

test("unassigning an open conversation clears ownership and returns it to Open", async () => {
  reset({
    conversation: { status: "ASSIGNED", assignedMemberId: "member-local", snoozedUntil: "later" },
  });

  const response = await patch({ action: "assign_to_member", assignedMemberId: null });

  assert.equal(response.status, 200);
  assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0].assignedMemberId, null);
  assert.equal(state.updates[0].status, "OPEN");
  assert.equal(state.updates[0].snoozedUntil, null);
  assert.equal(Object.hasOwn(state.updates[0], "aiPaused"), false);
  assert.equal(state.stateUpdates.length, 1);
});

test("reassigning a closed conversation keeps it closed and preserves its AI state", async () => {
  reset({
    members: [{ id: "member-next", workspaceId: "workspace-active" }],
    conversation: { status: "CLOSED", assignedMemberId: "member-current", aiPaused: true },
  });

  const response = await patch({ action: "assign_to_member", assignedMemberId: "member-next" });

  assert.equal(response.status, 200);
  assert.equal(state.updates[0].assignedMemberId, "member-next");
  assert.equal(state.updates[0].status, "CLOSED");
  assert.equal(Object.hasOwn(state.updates[0], "aiPaused"), false);
  assert.equal(state.stateUpdates.length, 1);
});

test("malformed assignee identifiers return 400 without changing state", async () => {
  const invalidAssignees = ["", " ", "x".repeat(129), 42, ["member-local"]];
  for (const assignedMemberId of invalidAssignees) {
    reset();
    const response = await patch({ action: "assign_to_member", assignedMemberId });
    assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(assignedMemberId)}`);
    assert.equal(state.updates.length, 0);
    assert.equal(state.stateUpdates.length, 0);
  }
});
