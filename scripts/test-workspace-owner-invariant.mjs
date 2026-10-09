import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { build } from "esbuild";
import postgres from "postgres";

process.env.SKIP_ENV_VALIDATION ??= "true";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Workspace owner invariant tests require a local DATABASE_URL.");
}

const outputDirectory = await mkdtemp(join(tmpdir(), "cogni-owner-invariant-test-"));
const outputFile = join(outputDirectory, "owner-management.mjs");
await symlink(join(process.cwd(), "node_modules"), join(outputDirectory, "node_modules"), "dir");

await build({
  stdin: {
    contents: `
      export { updateWorkspaceMemberRole, removeWorkspaceMember, transferWorkspaceOwnership } from "@/features/workspaces/server/owner-management";
      export { acceptWorkspaceInviteMembership, listWorkspaceInvites } from "@/features/workspaces/server/members";
      export { getDb } from "@/lib/db/client";
      export { workspace, workspaceMember } from "@/lib/db/schema";
    `,
    resolveDir: process.cwd(),
    sourcefile: "workspace-owner-invariant-test-entry.ts",
  },
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "server-only-test-stub",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "server-only-test-stub",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "server-only-test-stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
  ],
});

const {
  getDb,
  acceptWorkspaceInviteMembership,
  listWorkspaceInvites,
  removeWorkspaceMember,
  transferWorkspaceOwnership,
  updateWorkspaceMemberRole,
  workspace,
  workspaceMember,
} = await import(`${pathToFileURL(outputFile).href}?run=${randomUUID()}`);
const primaryDb = getDb();
const secondClient = postgres(databaseUrl, { max: 1, prepare: false });
const secondDb = drizzle(secondClient, { schema: { workspace, workspaceMember } });
const raw = postgres(databaseUrl, { max: 1 });
const workspaceIds = [randomUUID(), randomUUID(), randomUUID()];
const userIds = Array.from({ length: 6 }, () => randomUUID());
const membershipIds = Array.from({ length: 6 }, () => randomUUID());
const now = new Date().toISOString();

before(async () => {
  await raw`
    INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES
      (${workspaceIds[0]}, 'Owner lock test A', ${`owner-lock-${workspaceIds[0]}`}, ${now}),
      (${workspaceIds[1]}, 'Owner lock test B', ${`owner-lock-${workspaceIds[1]}`}, ${now}),
      (${workspaceIds[2]}, 'Owner lock test C', ${`owner-lock-${workspaceIds[2]}`}, ${now})
  `;
  for (const [index, userId] of userIds.entries()) {
    await raw`
      INSERT INTO "user" ("id", "name", "email", "updatedAt")
      VALUES (${userId}, ${`Owner lock test ${index}`}, ${`${userId}@example.test`}, ${now})
    `;
  }
  await raw`
    INSERT INTO "workspace_member" ("id", "userId", "workspaceId", "role", "updatedAt") VALUES
      (${membershipIds[0]}, ${userIds[0]}, ${workspaceIds[0]}, 'OWNER', ${now}),
      (${membershipIds[1]}, ${userIds[1]}, ${workspaceIds[0]}, 'OWNER', ${now}),
      (${membershipIds[2]}, ${userIds[2]}, ${workspaceIds[1]}, 'OWNER', ${now}),
      (${membershipIds[3]}, ${userIds[3]}, ${workspaceIds[1]}, 'OWNER', ${now}),
      (${membershipIds[4]}, ${userIds[4]}, ${workspaceIds[2]}, 'OWNER', ${now}),
      (${membershipIds[5]}, ${userIds[5]}, ${workspaceIds[2]}, 'MEMBER', ${now})
  `;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" IN (${workspaceIds[0]}, ${workspaceIds[1]}, ${workspaceIds[2]})`;
  await raw`DELETE FROM "user" WHERE "id" IN (${userIds[0]}, ${userIds[1]}, ${userIds[2]}, ${userIds[3]}, ${userIds[4]}, ${userIds[5]})`;
  await primaryDb.$client.end({ timeout: 5 });
  await secondClient.end({ timeout: 5 });
  await raw.end({ timeout: 5 });
  await rm(outputDirectory, { recursive: true, force: true });
});

async function getOwners(workspaceId) {
  return raw`
    SELECT "id" FROM "workspace_member"
    WHERE "workspaceId" = ${workspaceId} AND "role" = 'OWNER'
  `;
}

test("concurrent owners cannot demote each other and leave a workspace ownerless", async () => {
  const [first, second] = await Promise.all([
    updateWorkspaceMemberRole(
      primaryDb,
      workspaceIds[0],
      membershipIds[0],
      membershipIds[1],
      "MEMBER",
    ),
    updateWorkspaceMemberRole(
      secondDb,
      workspaceIds[0],
      membershipIds[1],
      membershipIds[0],
      "MEMBER",
    ),
  ]);

  assert.equal(Number(first) + Number(second), 1);
  assert.equal((await getOwners(workspaceIds[0])).length, 1);
});

test("concurrent owner removal and demotion preserve one current owner", async () => {
  const [removed, demoted] = await Promise.all([
    removeWorkspaceMember(primaryDb, workspaceIds[1], membershipIds[2], membershipIds[3]),
    updateWorkspaceMemberRole(
      secondDb,
      workspaceIds[1],
      membershipIds[3],
      membershipIds[2],
      "MEMBER",
    ),
  ]);

  assert.equal(Number(removed) + Number(demoted), 1);
  assert.equal((await getOwners(workspaceIds[1])).length, 1);
});

test("ownership transfer is atomic and keeps the new owner privileged", async () => {
  assert.equal(
    await transferWorkspaceOwnership(
      primaryDb,
      workspaceIds[2],
      membershipIds[4],
      membershipIds[5],
    ),
    true,
  );

  const owners = await getOwners(workspaceIds[2]);
  assert.deepEqual(
    owners.map((owner) => owner.id),
    [membershipIds[5]],
  );
});

test("accepting a stale member invite cannot demote an existing owner", async () => {
  const inviteId = randomUUID();
  const inviteEmail = `${userIds[5]}@example.test`;
  const acceptedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  await raw`
    INSERT INTO "workspace_invite" ("id", "email", "role", "token", "expiresAt", "workspaceId")
    VALUES (${inviteId}, ${inviteEmail}, 'MEMBER', ${randomUUID()}, ${expiresAt}, ${workspaceIds[2]})
  `;
  const [insertedInvite] = await raw`
    SELECT "email", "acceptedAt", "expiresAt" FROM "workspace_invite" WHERE "id" = ${inviteId}
  `;
  assert.equal(insertedInvite.email, inviteEmail);
  assert.equal(insertedInvite.acceptedAt, null);
  assert.ok(new Date(insertedInvite.expiresAt) > new Date(acceptedAt));

  assert.equal(
    await acceptWorkspaceInviteMembership(primaryDb, {
      inviteId,
      workspaceId: workspaceIds[2],
      userId: userIds[5],
      email: inviteEmail,
      acceptedAt,
    }),
    true,
  );

  const [existingOwner] = await raw`
    SELECT "role" FROM "workspace_member"
    WHERE "id" = ${membershipIds[5]} AND "workspaceId" = ${workspaceIds[2]}
  `;
  assert.equal(existingOwner.role, "OWNER");
});

test("pending invite summaries are workspace-scoped and never return bearer tokens", async () => {
  const inviteId = randomUUID();
  const inviteEmail = `pending-${randomUUID()}@example.test`;
  const inviteToken = randomUUID();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  await raw`
    INSERT INTO "workspace_invite" ("id", "email", "role", "token", "expiresAt", "workspaceId")
    VALUES (${inviteId}, ${inviteEmail}, 'MEMBER', ${inviteToken}, ${expiresAt}, ${workspaceIds[0]})
  `;

  const [workspaceInvites, otherWorkspaceInvites] = await Promise.all([
    listWorkspaceInvites(primaryDb, workspaceIds[0]),
    listWorkspaceInvites(primaryDb, workspaceIds[1]),
  ]);
  const invite = workspaceInvites.find((item) => item.id === inviteId);

  assert.ok(invite);
  assert.equal(invite.email, inviteEmail);
  assert.equal("token" in invite, false);
  assert.equal(
    workspaceInvites.some((item) => item.id === inviteId),
    true,
  );
  assert.equal(
    otherWorkspaceInvites.some((item) => item.id === inviteId),
    false,
  );
});
