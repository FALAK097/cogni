import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/knowledge/server/safe-fetch.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const {
  assertPublicHttpUrl,
  isPublicIpAddress,
  resolveRedirectUrl,
  safeFetchTestHelpers,
  selectPinnedPublicAddress,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("only public HTTP(S) URLs on standard web ports are accepted", () => {
  assert.equal(assertPublicHttpUrl("https://support.example.com/articles#faq").hash, "");
  assert.equal(assertPublicHttpUrl("http://93.184.216.34/help").hostname, "93.184.216.34");
  assert.equal(assertPublicHttpUrl("https://[2606:4700:4700::1111]/").protocol, "https:");

  for (const url of [
    "file:///etc/passwd",
    "https://user:secret@support.example.com/",
    "http://support.example.com:8080/",
    "http://localhost/",
    "http://printer.local/",
    "http://service.internal/",
    "http://127.1/",
    "http://2130706433/",
    "http://[::1]/",
  ]) {
    assert.throws(() => assertPublicHttpUrl(url), url);
  }
});

test("public IP validation excludes special-use IPv4 and IPv6 ranges", () => {
  for (const address of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.31.255.255",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002::1",
    "3fff::1",
  ]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }

  for (const address of ["8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"]) {
    assert.equal(isPublicIpAddress(address), true, address);
  }
});

test("DNS pinning fails closed for mixed or empty DNS answers", () => {
  assert.deepEqual(selectPinnedPublicAddress([{ address: "93.184.216.34", family: 4 }]), {
    address: "93.184.216.34",
    family: 4,
  });
  assert.throws(
    () =>
      selectPinnedPublicAddress([
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.2", family: 4 },
      ]),
    /private or unavailable/,
  );
  assert.throws(() => selectPinnedPublicAddress([]), /private or unavailable/);
});

test("redirect targets are normalized and pass the same URL policy", () => {
  const currentUrl = assertPublicHttpUrl("https://support.example.com/docs/start");
  assert.equal(
    resolveRedirectUrl(currentUrl, "../billing").href,
    "https://support.example.com/billing",
  );
  assert.throws(() => resolveRedirectUrl(currentUrl, "http://127.0.0.1/admin"));
  assert.throws(() => resolveRedirectUrl(currentUrl, "file:///etc/passwd"));
});

test("every redirect is resolved and pinned again before its request", async () => {
  const dnsLookups = [];
  const requests = [];
  const result = await safeFetchTestHelpers.fetchWithDependencies(
    "https://start.example.com/docs",
    ["text/html"],
    128,
    5_000,
    {
      lookupAddress: async (hostname) => {
        dnsLookups.push(hostname);
        return selectPinnedPublicAddress([{ address: "93.184.216.34", family: 4 }]);
      },
      requestText: async (url, address) => {
        requests.push({ hostname: url.hostname, address: address.address });
        return requests.length === 1
          ? { kind: "redirect", location: "https://next.example.net/final" }
          : { kind: "response", text: "done" };
      },
    },
  );

  assert.equal(result, "done");
  assert.deepEqual(dnsLookups, ["start.example.com", "next.example.net"]);
  assert.deepEqual(requests, [
    { hostname: "start.example.com", address: "93.184.216.34" },
    { hostname: "next.example.net", address: "93.184.216.34" },
  ]);
});

test("a redirect whose DNS answers change to a private address is never requested", async () => {
  const requests = [];
  await assert.rejects(
    safeFetchTestHelpers.fetchWithDependencies(
      "https://start.example.com/docs",
      ["text/html"],
      128,
      5_000,
      {
        lookupAddress: async (hostname) =>
          selectPinnedPublicAddress(
            hostname === "start.example.com"
              ? [{ address: "93.184.216.34", family: 4 }]
              : [
                  { address: "93.184.216.35", family: 4 },
                  { address: "169.254.169.254", family: 4 },
                ],
          ),
        requestText: async (url) => {
          requests.push(url.hostname);
          return { kind: "redirect", location: "https://next.example.net/final" };
        },
      },
    ),
    /private or unavailable/,
  );

  assert.deepEqual(requests, ["start.example.com"]);
});

test("response bodies are limited by bytes while streaming", async () => {
  const readLimitedBody = safeFetchTestHelpers.readLimitedBody;
  assert.equal(await readLimitedBody(Readable.from([Buffer.from("small")]), 5), "small");
  assert.equal(await readLimitedBody(Readable.from([Buffer.from("too large")]), 5), null);
  assert.equal(
    await readLimitedBody(Readable.from([new Uint8Array([0xc3]), new Uint8Array([0xa9])]), 2),
    "é",
  );
});
