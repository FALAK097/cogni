import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage, type RequestOptions } from "node:http";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";

const maxRedirects = 3;
const defaultTimeoutMs = 15_000;
const blockedHostnameSuffixes = [
  ".localhost",
  ".local",
  ".internal",
  ".test",
  ".invalid",
  ".example",
  ".onion",
  ".home.arpa",
];

type ResolvedAddress = { address: string; family: 4 | 6 };
type ResponseResult =
  | { kind: "redirect"; location: string }
  | { kind: "response"; text: string | null };

function ipv4ToBigInt(address: string) {
  return address
    .split(".")
    .reduce((value, octet) => (value << BigInt(8)) | BigInt(Number(octet)), BigInt(0));
}

function ipv4InCidr(address: string, network: string, prefix: number) {
  const shift = BigInt(32 - prefix);
  return ipv4ToBigInt(address) >> shift === ipv4ToBigInt(network) >> shift;
}

function parseIpv6(address: string) {
  const parts = address.split("::");
  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts[1] ? parts[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (parts.length > 2 || missing < 0 || (parts.length === 1 && missing !== 0)) return null;
  const groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  return BigInt(`0x${groups.map((group) => group.padStart(4, "0")).join("")}`);
}

function ipv6InCidr(address: bigint, network: string, prefix: number) {
  const networkAddress = parseIpv6(network);
  if (networkAddress === null) return false;
  const shift = BigInt(128 - prefix);
  return address >> shift === networkAddress >> shift;
}

export function isPublicIpAddress(address: string) {
  const family = isIP(address);
  if (family === 4) {
    const blockedRanges: [string, number][] = [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.88.99.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ];
    return !blockedRanges.some(([network, prefix]) => ipv4InCidr(address, network, prefix));
  }

  if (family !== 6) return false;
  const parsed = parseIpv6(address);
  if (parsed === null || !ipv6InCidr(parsed, "2000::", 3)) return false;

  const blockedRanges: [string, number][] = [
    ["2001::", 23],
    ["2001:db8::", 32],
    ["2002::", 16],
    ["3fff::", 20],
  ];
  return !blockedRanges.some(([network, prefix]) => ipv6InCidr(parsed, network, prefix));
}

function normalizeHostname(hostname: string) {
  return hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

export function assertPublicHttpUrl(sourceUrl: string) {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error("Enter a valid website URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not supported.");
  }
  if (url.port && url.port !== (url.protocol === "https:" ? "443" : "80")) {
    throw new Error("Only standard HTTP and HTTPS ports are supported.");
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname || (!hostname.includes(".") && isIP(hostname) === 0)) {
    throw new Error("Private or local URLs are not supported.");
  }
  if (blockedHostnameSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error("Private or local URLs are not supported.");
  }
  if (isIP(hostname) && !isPublicIpAddress(hostname)) {
    throw new Error("Private or local URLs are not supported.");
  }

  url.hash = "";
  return url;
}

export function resolveRedirectUrl(currentUrl: URL, location: string) {
  return assertPublicHttpUrl(new URL(location, currentUrl).href);
}

export function selectPinnedPublicAddress(addresses: readonly ResolvedAddress[]) {
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Error("The website resolved to a private or unavailable address.");
  }
  const address = addresses[0];
  if (!address) throw new Error("The website could not be resolved.");
  return address;
}

async function lookupPublicAddress(hostname: string, timeoutMs: number): Promise<ResolvedAddress> {
  const family = isIP(hostname);
  if (family === 4 || family === 6) {
    if (!isPublicIpAddress(hostname)) {
      throw new Error("Private or local URLs are not supported.");
    }
    return { address: hostname, family };
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const addresses = await Promise.race([
      dnsLookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Website DNS lookup timed out.")), timeoutMs);
      }),
    ]);
    const resolvedAddresses: ResolvedAddress[] = [];
    for (const resolved of addresses) {
      const resolvedFamily = isIP(resolved.address);
      if (resolvedFamily !== 4 && resolvedFamily !== 6) {
        throw new Error("The website resolved to an invalid address.");
      }
      resolvedAddresses.push({ address: resolved.address, family: resolvedFamily });
    }
    return selectPinnedPublicAddress(resolvedAddresses);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readLimitedBody(response: AsyncIterable<Uint8Array>, maxBytes: number) {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for await (const chunk of response) {
    totalBytes += chunk.byteLength;
    if (totalBytes > maxBytes) return null;
    chunks.push(chunk);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function makePinnedLookup(address: ResolvedAddress): NonNullable<RequestOptions["lookup"]> {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [address]);
    } else {
      callback(null, address.address, address.family);
    }
  };
}

async function requestText(
  url: URL,
  address: ResolvedAddress,
  acceptedTypes: readonly string[],
  maxBytes: number,
  timeoutMs: number,
): Promise<ResponseResult> {
  const hostname = normalizeHostname(url.hostname);
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  const options: RequestOptions = {
    protocol: url.protocol,
    hostname,
    port: url.port || undefined,
    path: `${url.pathname}${url.search}`,
    method: "GET",
    agent: false,
    lookup: makePinnedLookup(address),
    headers: {
      accept: acceptedTypes.join(", "),
      "accept-encoding": "identity",
      connection: "close",
      host: url.host,
      "user-agent": "CogniKnowledgeImporter/1.0",
    },
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result: ResponseResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    };

    const req = request(options);
    const timeout = setTimeout(
      () => req.destroy(new Error("Website request timed out.")),
      timeoutMs,
    );

    req.once("error", fail);
    req.once("response", (response: IncomingMessage) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if (status >= 300 && status < 400 && typeof location === "string") {
        response.destroy();
        finish({ kind: "redirect", location });
        return;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        finish({ kind: "response", text: null });
        return;
      }

      const contentType = response.headers["content-type"]?.toLowerCase() ?? "";
      if (!acceptedTypes.some((acceptedType) => contentType.includes(acceptedType))) {
        response.destroy();
        finish({ kind: "response", text: null });
        return;
      }

      const contentLength = Number(response.headers["content-length"] ?? "0");
      if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        response.destroy();
        finish({ kind: "response", text: null });
        return;
      }

      void readLimitedBody(response, maxBytes).then(
        (text) => finish({ kind: "response", text }),
        (error: unknown) =>
          fail(error instanceof Error ? error : new Error("Website response failed.")),
      );
    });
    req.end();
  });
}

type SafeFetchDependencies = {
  lookupAddress: typeof lookupPublicAddress;
  requestText: typeof requestText;
};

async function fetchPublicTextWithDependencies(
  sourceUrl: string,
  acceptedTypes: readonly string[],
  maxBytes: number,
  timeoutMs: number,
  dependencies: SafeFetchDependencies,
) {
  let currentUrl = assertPublicHttpUrl(sourceUrl);
  const deadline = Date.now() + timeoutMs;

  for (let redirectCount = 0; ; redirectCount += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new Error("Website request timed out.");

    const hostname = normalizeHostname(currentUrl.hostname);
    const address = await dependencies.lookupAddress(hostname, remainingMs);
    const response = await dependencies.requestText(
      currentUrl,
      address,
      acceptedTypes,
      maxBytes,
      deadline - Date.now(),
    );
    if (response.kind === "response") return response.text;
    if (redirectCount >= maxRedirects) return null;

    try {
      currentUrl = resolveRedirectUrl(currentUrl, response.location);
    } catch {
      return null;
    }
  }
}

export function fetchPublicText(
  sourceUrl: string,
  acceptedTypes: readonly string[],
  maxBytes: number,
  timeoutMs = defaultTimeoutMs,
) {
  return fetchPublicTextWithDependencies(sourceUrl, acceptedTypes, maxBytes, timeoutMs, {
    lookupAddress: lookupPublicAddress,
    requestText,
  });
}

export const safeFetchTestHelpers = {
  fetchWithDependencies: fetchPublicTextWithDependencies,
  readLimitedBody,
};
