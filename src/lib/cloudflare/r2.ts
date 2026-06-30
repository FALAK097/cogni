import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { R2Bucket } from "@cloudflare/workers-types";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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
  return Boolean(
    getUploadsBinding() ||
    (env.CLOUDFLARE_ACCOUNT_ID &&
      env.R2_BUCKET_NAME &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY),
  );
}

export function getR2Endpoint() {
  if (!env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("Cloudflare account ID is required for R2.");
  }

  return `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

let client: S3Client | undefined;

function getR2Client() {
  if (!isR2Configured() || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 is not configured.");
  }

  client ??= new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return client;
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

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
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

  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error("R2 object body is empty.");
  }

  return Buffer.from(await response.Body.transformToByteArray());
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

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}
