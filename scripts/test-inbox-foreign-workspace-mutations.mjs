import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {};
globalThis.__inboxForeignWorkspaceMutationTest = state;

const responseStub = `export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };`;
const drizzleStub = `export const eq = (field, value) => ({ op: "eq", field, value }); export const and = (...conditions) => ({ op: "and", conditions });`;

async function loadRoute(entryPoint, stubs) {
  const compiled = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    alias: { "@": resolve("src") },
    plugins: [
      {
        name: "inbox-foreign-workspace-mutation-test",
        setup(buildContext) {
          buildContext.onResolve(
            { filter: /^(server-only|next\/server|drizzle-orm|ai|@\/.*)$/ },
            (args) =>
              args.path in stubs
                ? { path: args.path, namespace: "inbox-foreign-workspace-mutation-test" }
                : undefined,
          );
          buildContext.onLoad(
            { filter: /.*/, namespace: "inbox-foreign-workspace-mutation-test" },
            (args) => ({ contents: stubs[args.path], loader: "js", resolveDir: process.cwd() }),
          );
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );
}

const sessionDeleteRoute = await loadRoute(
  "src/app/api/dashboard/widget/sessions/[session_id]/route.ts",
  {
    "next/server": responseStub,
    "drizzle-orm": drizzleStub,
    "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => globalThis.__inboxForeignWorkspaceMutationTest.session.context;`,
    "@/lib/auth/permissions": `export const canManageWorkspace = (role) => role === "OWNER";`,
    "@/features/conversations/server/conversation-service": `export const appendConversationMessage = async (...args) => { globalThis.__inboxForeignWorkspaceMutationTest.session.effects.push(["append", args]); return true; }; export const recordConversationEvent = async (...args) => { globalThis.__inboxForeignWorkspaceMutationTest.session.effects.push(["event", args]); }; export const updateConversationState = async (...args) => { globalThis.__inboxForeignWorkspaceMutationTest.session.effects.push(["state", args]); return true; };`,
    "@/lib/db/client": `export const runDbWriteOperation = async (db, operation) => operation(db);`,
    "@/features/conversations/dashboard-session-patch": `export const DASHBOARD_SESSION_MESSAGE_MAX_LENGTH = 4000; export const DASHBOARD_SESSION_PATCH_MAX_BYTES = 8192; export const dashboardSessionPatchSchema = { safeParse: (value) => ({ success: true, data: value }) };`,
    "@/lib/http/read-bounded-json": `export const readBoundedJson = async (request) => ({ ok: true, value: await request.json() });`,
    "@/features/widget/server/widget-data-filters": `export const getDashboardEngagedVisitorSessionCond = (fields) => ({ op: "eq", field: fields.engaged, value: true });`,
    "@/lib/db/schema": `export const conversation = { id: "conversation.id", workspaceId: "conversation.workspaceId", visitorSessionId: "conversation.visitorSessionId" }; export const contact = { id: "contact.id" }; export const visitorSession = { id: "visitorSession.id", widgetId: "visitorSession.widgetId", engaged: "visitorSession.engaged" };`,
  },
);

const labelsRoute = await loadRoute(
  "src/app/api/dashboard/conversations/[conversation_id]/labels/route.ts",
  {
    "next/server": responseStub,
    "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => globalThis.__inboxForeignWorkspaceMutationTest.labels.context;`,
    "@/features/conversations/server/labels": `export const changeConversationLabel = async (input) => { const state = globalThis.__inboxForeignWorkspaceMutationTest.labels; state.calls.push(input); if (input.workspaceId !== state.foreignConversation.workspaceId || input.conversationId !== state.foreignConversation.id) return { kind: "not-found" }; state.foreignConversation.labels.push(input.label); state.writes += 1; state.events.push([input.workspaceId, input.conversationId, "state"]); return { kind: "updated", labels: state.foreignConversation.labels }; };`,
    "@/features/conversations/inbox-pagination": `import { z } from "zod"; export const conversationLabelSchema = z.string().trim().min(1);`,
  },
);

const contactTagsRoute = await loadRoute(
  "src/app/api/dashboard/conversations/[conversation_id]/contact-tags/route.ts",
  {
    "next/server": responseStub,
    "drizzle-orm": drizzleStub,
    "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => globalThis.__inboxForeignWorkspaceMutationTest.contactTags.context;`,
    "@/features/contacts/server/contact-tags": `export const changeContactTag = async (input) => { const state = globalThis.__inboxForeignWorkspaceMutationTest.contactTags; state.tagCalls.push(input); state.foreignContact.tags.push(input.tag); state.writes += 1; return { kind: "updated", tags: state.foreignContact.tags }; };`,
    "@/lib/db/schema": `export const conversation = { id: "conversation.id", workspaceId: "conversation.workspaceId" };`,
  },
);

const copilotRoute = await loadRoute(
  "src/app/api/dashboard/conversations/[conversation_id]/copilot/route.ts",
  {
    "next/server": responseStub,
    "drizzle-orm": drizzleStub,
    ai: `export const Output = { object: (value) => value }; export const generateText = async (...args) => { globalThis.__inboxForeignWorkspaceMutationTest.copilot.modelCalls.push(args); return {}; };`,
    "@/features/knowledge/server/retrieval": `export const retrieveKnowledgeContext = async (...args) => { const state = globalThis.__inboxForeignWorkspaceMutationTest.copilot; state.retrievalCalls.push(args); return []; };`,
    "@/lib/ai/providers": `export const getWidgetModel = (...args) => { globalThis.__inboxForeignWorkspaceMutationTest.copilot.providerCalls.push(args); return {}; };`,
    "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => globalThis.__inboxForeignWorkspaceMutationTest.copilot.context;`,
    "@/lib/db/schema": `export const agentRun = { id: "agentRun.id", workspaceId: "agentRun.workspaceId" };`,
  },
);
const { PATCH: patchSession } = sessionDeleteRoute;

const labelsService = await loadRoute("src/features/conversations/server/labels.ts", {
  "server-only": "export {};",
  "drizzle-orm": drizzleStub,
  "@/lib/db/client": `export const runDbWriteOperation = async (db, operation) => operation(db);`,
  "@/lib/db/schema": `export const conversation = { id: "conversation.id", workspaceId: "conversation.workspaceId", labels: "conversation.labels" };`,
  "@/features/conversations/inbox-pagination": `export const conversationLabelSchema = { safeParse: (value) => typeof value === "string" && value.trim() ? { success: true, data: value.trim() } : { success: false } };`,
  "@/features/conversations/server/conversation-service": `export const recordConversationEvent = async (...args) => { globalThis.__inboxForeignWorkspaceMutationTest.helperEvents.push(args); };`,
});

const eq = (field, value) => ({ op: "eq", field, value });
const and = (...conditions) => ({ op: "and", conditions });

function flatten(expression) {
  return expression?.op === "and"
    ? expression.conditions.flatMap((condition) => flatten(condition))
    : [expression];
}

function matches(record, expression) {
  return flatten(expression).every(
    (condition) =>
      condition?.op === "eq" && record[condition.field.split(".").at(-1)] === condition.value,
  );
}

function foreignConversationLabelDb() {
  const state = {
    row: { id: "conversation-foreign", workspaceId: "workspace-foreign", labels: '["existing"]' },
    predicates: [],
    updates: [],
    events: [],
  };
  globalThis.__inboxForeignWorkspaceMutationTest.helperEvents = state.events;
  const db = {
    select: () => ({
      from: () => ({
        where: (predicate) => ({
          for: async () => {
            state.predicates.push(predicate);
            return matches(state.row, predicate) ? [{ labels: state.row.labels }] : [];
          },
        }),
      }),
    }),
    update: () => ({
      set: (values) => ({
        where: async (predicate) => state.updates.push({ values, predicate }),
      }),
    }),
  };
  return { db, state };
}

function sessionReset() {
  Object.assign(state, {
    session: {
      workspace: { id: "workspace-active" },
      membership: { id: "member-active", role: "OWNER" },
      activeWidget: { id: "widget-active", workspaceId: "workspace-active" },
      foreignSession: {
        id: "session-foreign",
        widgetId: "widget-foreign",
        engaged: true,
        contactId: "contact-foreign",
      },
      widgetScopes: [],
      sessionScopes: [],
      effects: [],
      writes: [],
    },
  });
  const sessionState = state.session;
  const db = {
    query: {
      widget: {
        findFirst: async ({ where }) => {
          const expression = where({ workspaceId: "widget.workspaceId" }, { eq });
          sessionState.widgetScopes.push(expression);
          return matches(sessionState.activeWidget, expression) ? sessionState.activeWidget : null;
        },
      },
      visitorSession: {
        findFirst: async ({ where }) => {
          const expression = where(
            {
              id: "visitorSession.id",
              widgetId: "visitorSession.widgetId",
              engaged: "visitorSession.engaged",
            },
            { eq, and },
          );
          sessionState.sessionScopes.push(expression);
          return matches(sessionState.foreignSession, expression)
            ? sessionState.foreignSession
            : null;
        },
      },
      conversation: {
        findFirst: async () => {
          sessionState.writes.push(["conversation-lookup"]);
          return null;
        },
      },
    },
    select: () => {
      sessionState.writes.push(["select"]);
      return { from: () => ({ where: async () => [] }) };
    },
    delete: (table) => ({
      where: async (condition) => {
        sessionState.writes.push(["delete", table, condition]);
        return [];
      },
    }),
  };
  sessionState.context = {
    db,
    workspace: sessionState.workspace,
    membership: sessionState.membership,
  };
}

function resetLabels() {
  Object.assign(state, {
    labels: {
      workspace: { id: "workspace-active" },
      foreignConversation: {
        id: "conversation-foreign",
        workspaceId: "workspace-foreign",
        labels: ["existing"],
      },
      calls: [],
      writes: 0,
      events: [],
    },
  });
  state.labels.context = { db: {}, workspace: state.labels.workspace };
}

function resetContactTags() {
  Object.assign(state, {
    contactTags: {
      workspace: { id: "workspace-active" },
      foreignConversation: {
        id: "conversation-foreign",
        workspaceId: "workspace-foreign",
        contactId: "contact-foreign",
      },
      foreignContact: { id: "contact-foreign", tags: ["existing"] },
      scopes: [],
      tagCalls: [],
      writes: 0,
    },
  });
  const tagState = state.contactTags;
  const db = {
    query: {
      conversation: {
        findFirst: async ({ where }) => {
          tagState.scopes.push(where);
          return matches(tagState.foreignConversation, where) ? tagState.foreignConversation : null;
        },
      },
    },
  };
  tagState.context = { db, workspace: tagState.workspace };
}

function resetCopilot() {
  Object.assign(state, {
    copilot: {
      workspace: { id: "workspace-active" },
      foreignConversation: {
        id: "conversation-foreign",
        workspaceId: "workspace-foreign",
        messages: JSON.stringify([{ authorType: "VISITOR", body: "secret" }]),
        contactId: "contact-foreign",
      },
      scopes: [],
      inserts: [],
      updates: [],
      retrievalCalls: [],
      providerCalls: [],
      modelCalls: [],
    },
  });
  const copilotState = state.copilot;
  const db = {
    query: {
      conversation: {
        findFirst: async ({ where }) => {
          const expression = where(
            { id: "conversation.id", workspaceId: "conversation.workspaceId" },
            { eq, and },
          );
          copilotState.scopes.push(expression);
          return matches(copilotState.foreignConversation, expression)
            ? copilotState.foreignConversation
            : null;
        },
      },
    },
    insert: (table) => ({
      values: (values) => {
        copilotState.inserts.push({ table, values });
      },
    }),
    update: (table) => ({
      set: (values) => ({
        where: (condition) => {
          copilotState.updates.push({ table, values, condition });
        },
      }),
    }),
  };
  copilotState.context = {
    db,
    workspace: copilotState.workspace,
    session: { user: { id: "user-active" } },
  };
}

test("foreign widget sessions cannot be deleted or emit conversation events", async () => {
  sessionReset();

  const response = await sessionDeleteRoute.DELETE(new Request("https://cogni.test"), {
    params: Promise.resolve({ session_id: "session-foreign" }),
  });

  assert.equal(response.status, 404);
  assert.deepEqual(state.session.widgetScopes, [
    { op: "eq", field: "widget.workspaceId", value: "workspace-active" },
  ]);
  assert.deepEqual(state.session.sessionScopes, [
    {
      op: "and",
      conditions: [
        { op: "eq", field: "visitorSession.id", value: "session-foreign" },
        { op: "eq", field: "visitorSession.widgetId", value: "widget-active" },
        { op: "eq", field: "visitorSession.engaged", value: true },
      ],
    },
  ]);
  assert.deepEqual(state.session.writes, []);
  assert.deepEqual(state.session.effects, []);
});

test("foreign widget sessions cannot be assigned, replied to, or noted", async () => {
  const actions = [
    { action: "assign" },
    { action: "reply", message: "Should not be sent" },
    { action: "note", message: "Should not be stored" },
  ];

  for (const action of actions) {
    sessionReset();
    const response = await patchSession(
      new Request("https://cogni.test/api/sessions/session-foreign", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      }),
      { params: Promise.resolve({ session_id: "session-foreign" }) },
    );

    assert.equal(response.status, 404);
    assert.deepEqual(state.session.widgetScopes, [
      { op: "eq", field: "widget.workspaceId", value: "workspace-active" },
    ]);
    assert.deepEqual(state.session.sessionScopes, [
      {
        op: "and",
        conditions: [
          { op: "eq", field: "visitorSession.id", value: "session-foreign" },
          { op: "eq", field: "visitorSession.widgetId", value: "widget-active" },
          { op: "eq", field: "visitorSession.engaged", value: true },
        ],
      },
    ]);
    assert.deepEqual(state.session.writes, []);
    assert.deepEqual(state.session.effects, []);
  }
});

test("foreign conversation label writes leave labels and events unchanged", async () => {
  resetLabels();

  const response = await labelsRoute.PATCH(
    new Request("https://cogni.test/api/labels", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "add", label: "urgent" }),
    }),
    { params: Promise.resolve({ conversation_id: "conversation-foreign" }) },
  );

  assert.equal(response.status, 404);
  assert.equal(state.labels.calls.length, 1);
  assert.equal(state.labels.calls[0].workspaceId, "workspace-active");
  assert.equal(state.labels.calls[0].conversationId, "conversation-foreign");
  assert.deepEqual(state.labels.foreignConversation.labels, ["existing"]);
  assert.equal(state.labels.writes, 0);
  assert.deepEqual(state.labels.events, []);
});

test("the real label helper scopes its SELECT and never updates a foreign conversation", async () => {
  const { db, state: labelState } = foreignConversationLabelDb();

  const result = await labelsService.changeConversationLabel({
    db,
    workspaceId: "workspace-active",
    conversationId: "conversation-foreign",
    action: "add",
    label: "urgent",
  });

  assert.deepEqual(result, { kind: "not-found" });
  assert.deepEqual(labelState.predicates, [
    {
      op: "and",
      conditions: [
        { op: "eq", field: "conversation.id", value: "conversation-foreign" },
        { op: "eq", field: "conversation.workspaceId", value: "workspace-active" },
      ],
    },
  ]);
  assert.deepEqual(labelState.updates, []);
  assert.deepEqual(labelState.events, []);
  assert.deepEqual(JSON.parse(labelState.row.labels), ["existing"]);
});

test("foreign conversation contact-tag writes do not reach the contact mutator", async () => {
  resetContactTags();

  const response = await contactTagsRoute.PATCH(
    new Request("https://cogni.test/api/contact-tags", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "add", tag: "vip" }),
    }),
    { params: Promise.resolve({ conversation_id: "conversation-foreign" }) },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(state.contactTags.scopes, [
    {
      op: "and",
      conditions: [
        { op: "eq", field: "conversation.id", value: "conversation-foreign" },
        { op: "eq", field: "conversation.workspaceId", value: "workspace-active" },
      ],
    },
  ]);
  assert.deepEqual(state.contactTags.tagCalls, []);
  assert.deepEqual(state.contactTags.foreignContact.tags, ["existing"]);
  assert.equal(state.contactTags.writes, 0);
});

test("copilot rejects foreign conversations before agent-run, retrieval, or model work", async () => {
  resetCopilot();

  const response = await copilotRoute.POST(new Request("https://cogni.test/api/copilot"), {
    params: Promise.resolve({ conversation_id: "conversation-foreign" }),
  });

  assert.equal(response.status, 404);
  assert.deepEqual(state.copilot.scopes, [
    {
      op: "and",
      conditions: [
        { op: "eq", field: "conversation.id", value: "conversation-foreign" },
        { op: "eq", field: "conversation.workspaceId", value: "workspace-active" },
      ],
    },
  ]);
  assert.deepEqual(state.copilot.inserts, []);
  assert.deepEqual(state.copilot.updates, []);
  assert.deepEqual(state.copilot.retrievalCalls, []);
  assert.deepEqual(state.copilot.providerCalls, []);
  assert.deepEqual(state.copilot.modelCalls, []);
});
