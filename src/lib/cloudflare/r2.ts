import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { R2Bucket } from "@cloudflare/workers-types";

import { env } from "@/lib/env/server";

type CloudflareR2Env = {
  UPLOADS?: R2Bucket;
};

function getUploadsBinding() {
  if (env.ENV !== "production") {
    return null;
  }

  try {
    return (getCloudflareContext().env as unknown as CloudflareR2Env).UPLOADS ?? null;
  } catch {
    return null;
  }
}

export function isR2Configured() {
  return Boolean(getUploadsBinding());
}

export async function putR2Object({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const uploads = getUploadsBinding();
  if (uploads) {
    await uploads.put(key, body, {
      httpMetadata: {
        contentType,
      },
    });
    return;
  }

  if (!env.R2_BUCKET_NAME) {
    throw new Error("R2 is not configured.");
  }

  throw new Error("R2 binding is required for production uploads.");
}

export async function getR2Object(key: string) {
  const uploads = getUploadsBinding();
  if (uploads) {
    const object = await uploads.get(key);
    if (!object) {
      throw new Error("R2 object was not found.");
    }

    return Buffer.from(await object.arrayBuffer());
  }

  if (!env.R2_BUCKET_NAME) {
    throw new Error("R2 is not configured.");
  }

  throw new Error("R2 binding is required for production uploads.");
}

export async function deleteR2Object(key: string) {
  const uploads = getUploadsBinding();
  if (uploads) {
    await uploads.delete(key);
    return;
  }

  if (!env.R2_BUCKET_NAME) {
    throw new Error("R2 is not configured.");
  }

  throw new Error("R2 binding is required for production uploads.");
}
