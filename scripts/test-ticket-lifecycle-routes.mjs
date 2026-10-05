import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {};
globalThis.__ticketRouteTest = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = () => globalThis.__ticketRouteTest.context();`,
  "@/lib/db/schema": `export const conversation = { id: "conversation.id", workspaceId: "conversation.workspaceId" }; export const ticket = { id: "ticket.id", workspaceId: "ticket.workspaceId", conversationId: "ticket.conversationId" }; export const workspaceMember = { id: "workspaceMember.id", workspaceId: "workspaceMember.workspaceId" };`,
  "drizzle-orm": `export const eq = (field, value) => ({ field, value }); export const and = (...conditions) => conditions;`,
};

async function loadRoute(entry) {
  const compiled = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    alias: { "@": resolve("src") },
    plugins: [
      {
        name: "ticket-route-test",
        setup(ctx) {
          ctx.onResolve({ filter: /^(next\/server|drizzle-orm|@\/.*)$/ }, (args) =>
            args.path in stubs ? { path: args.path, namespace: "ticket-route-test" } : undefined,
          );
          ctx.onLoad({ filter: /.*/, namespace: "ticket-route-test" }, (args) => ({
            contents: stubs[args.path],
            loader: "js",
          }));
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );
}

const createRoute = await loadRoute(
  "src/app/api/dashboard/conversations/[conversation_id]/ticket/route.ts",
);
const updateRoute = await loadRoute("src/app/api/dashboard/tickets/[ticket_id]/route.ts");

function matches(record, expression) {
  const conditions = Array.isArray(expression) ? expression.flat(Infinity) : [expression];
  return conditions.every(
    (condition) =>
      condition?.field && record[condition.field.split(".").at(-1)] === condition.value,
  );
}

function reset({ parent = null, member = null, existing = null } = {}) {
  Object.assign(state, {
    workspace: { id: "workspace-active" },
    membership: { id: "membership-active", role: "OWNER" },
    parent: parent ?? {
      id: "00000000-0000-4000-8000-000000000001",
      workspaceId: "workspace-active",
      subject: "Question",
      contactId: "contact-1",
      assignedMemberId: null,
    },
    member,
    existing,
    inserts: [],
    updates: [],
    context: async () => ({
      db: state.db,
      workspace: state.workspace,
      membership: state.membership,
    }),
  });
  state.db = {
    query: {
      conversation: {
        findFirst: async ({ where }) => (matches(state.parent, where) ? state.parent : null),
      },
      ticket: {
        findFirst: async ({ where }) =>
          state.existing && matches(state.existing, where) ? state.existing : null,
      },
      workspaceMember: {
        findFirst: async ({ where }) =>
          state.member && matches(state.member, where) ? state.member : null,
      },
    },
    insert: () => ({
      values: (values) => {
        state.inserts.push(values);
        return {
          onConflictDoNothing: () => ({
            returning: async () => [
              { ...values, id: "00000000-0000-4000-8000-000000000011", dueAt: null },
            ],
          }),
        };
      },
    }),
    update: () => ({
      set: (values) => {
        state.updates.push(values);
        return {
          where: (expression) => ({
            returning: async () => {
              state.updateExpression = expression;
              return state.existing && matches(state.existing, expression)
                ? [{ ...state.existing, ...values }]
                : [];
            },
          }),
        };
      },
    }),
  };
}

function request(method, body) {
  return new Request("https://cogni.test/api", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("ticket creation derives workspace and contact from the scoped conversation", async () => {
  reset({
    parent: {
      id: "00000000-0000-4000-8000-000000000001",
      workspaceId: "workspace-active",
      subject: "  Billing question  ",
      contactId: "contact-active",
      assignedMemberId: "00000000-0000-4000-8000-000000000021",
    },
    member: {
      id: "00000000-0000-4000-8000-000000000021",
      workspaceId: "workspace-active",
    },
  });
  const response = await createRoute.POST(request("POST", {}), {
    params: Promise.resolve({ conversation_id: "00000000-0000-4000-8000-000000000001" }),
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.ticket.workspaceId, "workspace-active");
  assert.equal(state.inserts[0].contactId, "contact-active");
  assert.equal(state.inserts[0].assignedMemberId, "00000000-0000-4000-8000-000000000021");
  assert.equal(state.inserts[0].title, "Billing question");
});

test("ticket creation hides conversations outside the active workspace", async () => {
  reset({
    parent: {
      id: "00000000-0000-4000-8000-000000000002",
      workspaceId: "workspace-other",
      subject: "Private",
      contactId: "foreign-contact",
      assignedMemberId: null,
    },
  });
  const response = await createRoute.POST(request("POST", {}), {
    params: Promise.resolve({ conversation_id: "00000000-0000-4000-8000-000000000002" }),
  });
  assert.equal(response.status, 404);
  assert.equal(state.inserts.length, 0);
});

test("ticket creation does not copy an assignee outside the active workspace", async () => {
  reset({
    parent: {
      id: "00000000-0000-4000-8000-000000000001",
      workspaceId: "workspace-active",
      subject: "Question",
      contactId: "contact-active",
      assignedMemberId: "00000000-0000-4000-8000-000000000022",
    },
    member: { id: "00000000-0000-4000-8000-000000000022", workspaceId: "workspace-other" },
  });
  const response = await createRoute.POST(request("POST", {}), {
    params: Promise.resolve({ conversation_id: "00000000-0000-4000-8000-000000000001" }),
  });
  assert.equal(response.status, 201);
  assert.equal(state.inserts[0].assignedMemberId, null);
});

test("ticket patch scopes the update to the active workspace", async () => {
  reset({
    existing: {
      id: "00000000-0000-4000-8000-000000000012",
      workspaceId: "workspace-other",
      status: "OPEN",
    },
  });
  const response = await updateRoute.PATCH(request("PATCH", { status: "RESOLVED" }), {
    params: Promise.resolve({ ticket_id: "00000000-0000-4000-8000-000000000012" }),
  });
  assert.equal(response.status, 404);
  assert.deepEqual(
    state.updateExpression.map((condition) => [condition.field, condition.value]),
    [
      ["ticket.id", "00000000-0000-4000-8000-000000000012"],
      ["ticket.workspaceId", "workspace-active"],
    ],
  );
  assert.equal(state.updates.length, 1);
});

test("ticket patch rejects assignees from another workspace before updating", async () => {
  reset({
    existing: {
      id: "00000000-0000-4000-8000-000000000011",
      workspaceId: "workspace-active",
      status: "OPEN",
    },
    member: { id: "00000000-0000-4000-8000-000000000022", workspaceId: "workspace-other" },
  });
  const response = await updateRoute.PATCH(
    request("PATCH", { assignedMemberId: "00000000-0000-4000-8000-000000000022" }),
    { params: Promise.resolve({ ticket_id: "00000000-0000-4000-8000-000000000011" }) },
  );
  assert.equal(response.status, 404);
  assert.equal(state.updates.length, 0);
});

test("ticket patch updates status and priority for a workspace member", async () => {
  reset({
    existing: {
      id: "00000000-0000-4000-8000-000000000011",
      workspaceId: "workspace-active",
      status: "OPEN",
    },
  });
  const response = await updateRoute.PATCH(
    request("PATCH", { status: "PENDING", priority: "URGENT", dueAt: null }),
    { params: Promise.resolve({ ticket_id: "00000000-0000-4000-8000-000000000011" }) },
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ticket.status, "PENDING");
  assert.equal(body.ticket.priority, "URGENT");
  assert.equal(state.updates[0].dueAt, null);
});

test("ticket patch rejects empty or unknown-field changes", async () => {
  reset({
    existing: {
      id: "00000000-0000-4000-8000-000000000011",
      workspaceId: "workspace-active",
      status: "OPEN",
    },
  });
  for (const body of [{}, { workspaceId: "workspace-other", status: "RESOLVED" }]) {
    const response = await updateRoute.PATCH(request("PATCH", body), {
      params: Promise.resolve({ ticket_id: "00000000-0000-4000-8000-000000000011" }),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(state.updates.length, 0);
});
