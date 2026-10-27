import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = { execute: async () => [] };
globalThis.__vpsHealthTest = state;

async function loadRoute(entryPoint) {
  const result = await build({
    entryPoints: [resolve(entryPoint)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    plugins: [
      {
        name: "vps-health-route-test",
        setup(buildContext) {
          buildContext.onResolve(
            { filter: /^(next\/server|drizzle-orm|@\/lib\/db\/client)$/ },
            (args) => ({
              path: args.path,
              namespace: "vps-health-route-test",
            }),
          );
          buildContext.onLoad({ filter: /.*/, namespace: "vps-health-route-test" }, (args) => ({
            contents:
              args.path === "next/server"
                ? `export const NextResponse = { json: (value, init) => Response.json(value, init) };`
                : args.path === "drizzle-orm"
                  ? `export const sql = () => "select 1";`
                  : `export const getDb = () => ({ execute: (...args) => globalThis.__vpsHealthTest.execute(...args) });`,
            loader: "js",
          }));
        },
      },
    ],
  });

  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
  );
}

test("live endpoint reports process health without a database dependency", async () => {
  const route = await loadRoute("src/app/api/health/live/route.ts");
  const response = route.GET();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("ready endpoint reports database health and fails closed when PostgreSQL is unavailable", async () => {
  const route = await loadRoute("src/app/api/health/ready/route.ts");
  state.execute = async () => [];
  const ready = await route.GET();

  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { status: "ready" });

  state.execute = async () => {
    throw new Error("database unavailable");
  };
  const unavailable = await route.GET();

  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { status: "not_ready" });
});
