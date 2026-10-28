import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = { env: { ENV: "production" }, calls: [] };
globalThis.__vpsStorageTest = state;

const stubs = {
  "server-only": "",
  "@/lib/env/server": `export const env = globalThis.__vpsStorageTest.env;`,
  "@/lib/cloudflare/r2": `
    export const isR2Configured = () => true;
    export const save = (method) => async (...args) => globalThis.__vpsStorageTest.calls.push([method, ...args]);
    export const putR2Object = save("putR2Object");
    export const getR2Object = save("getR2Object");
    export const deleteR2Object = save("deleteR2Object");
  `,
  "@/lib/storage/local": `
    export const createStorageKey = () => "workspace/file";
    export const isAllowedUpload = () => true;
    export const isAllowedKnowledgeUpload = () => true;
    export const uploadPublicPath = () => "/api/files/workspace/file";
    export const saveUpload = async (...args) => globalThis.__vpsStorageTest.calls.push(["saveUpload", ...args]);
    export const readUpload = async (...args) => globalThis.__vpsStorageTest.calls.push(["readUpload", ...args]);
    export const deleteUpload = async (...args) => globalThis.__vpsStorageTest.calls.push(["deleteUpload", ...args]);
  `,
};

const compiled = await build({
  entryPoints: [resolve("src/lib/storage/index.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "vps-storage-test",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^(server-only|@\/.*)$/ }, (args) =>
          args.path in stubs ? { path: args.path, namespace: "vps-storage-test" } : undefined,
        );
        buildContext.onLoad({ filter: /.*/, namespace: "vps-storage-test" }, (args) => ({
          contents: stubs[args.path],
          loader: "js",
        }));
      },
    },
  ],
});

const storage = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("production can select persistent local uploads without R2", async () => {
  Object.assign(state.env, { ENV: "production", UPLOAD_STORAGE: "local" });
  state.calls = [];

  await storage.saveObject({
    workspaceId: "workspace",
    filename: "file.txt",
    mimeType: "text/plain",
    bytes: Buffer.from("content"),
  });
  await storage.readObject("workspace/file");
  await storage.deleteObject("workspace/file");

  assert.deepEqual(
    state.calls.map(([method]) => method),
    ["saveUpload", "readUpload", "deleteUpload"],
  );
});

test("production keeps R2 as the default when upload storage is not selected", async () => {
  Object.assign(state.env, { ENV: "production" });
  delete state.env.UPLOAD_STORAGE;
  state.calls = [];

  await storage.saveObject({
    workspaceId: "workspace",
    filename: "file.txt",
    mimeType: "text/plain",
    bytes: Buffer.from("content"),
  });

  assert.equal(state.calls[0][0], "putR2Object");
});
