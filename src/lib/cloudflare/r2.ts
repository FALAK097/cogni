import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "@/lib/env/server";

type R2BucketObject = {
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type R2BucketBinding = {
  put: (
    key: string,
    value: Buffer | Uint8Array | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  get: (key: string) => Promise<R2BucketObject | null>;
  delete: (key: string) => Promise<void>;
};

function resolveR2Bucket(): R2BucketBinding | undefined {
  const cfContext = (
    globalThis as unknown as Record<symbol, { env?: { UPLOADS?: R2BucketBinding } } | undefined>
  )[Symbol.for("__cloudflare-context__")];
  return cfContext?.env?.UPLOADS;
}

function createS3R2Client(): S3Client | null {
  if (!isS3R2Configured()) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function isS3R2Configured() {
  return Boolean(
    env.CLOUDFLARE_ACCOUNT_ID &&
    env.R2_BUCKET_NAME &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY,
  );
}

export function isR2Configured() {
  return Boolean(resolveR2Bucket()) || isS3R2Configured();
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
  const bucket = resolveR2Bucket();
  if (bucket) {
    await bucket.put(key, body, { httpMetadata: { contentType } });
    return;
  }

  const r2 = createS3R2Client();
  if (!r2 || !env.R2_BUCKET_NAME) throw new Error("R2 is not configured.");

  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getR2Object(key: string) {
  const bucket = resolveR2Bucket();
  if (bucket) {
    const object = await bucket.get(key);
    if (!object) throw new Error("R2 object was not found.");
    return Buffer.from(await object.arrayBuffer());
  }

  const r2 = createS3R2Client();
  if (!r2 || !env.R2_BUCKET_NAME) throw new Error("R2 is not configured.");

  const object = await r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
  if (!object.Body) throw new Error("R2 object was not found.");
  return Buffer.from(await object.Body.transformToByteArray());
}

export async function deleteR2Object(key: string) {
  const bucket = resolveR2Bucket();
  if (bucket) {
    await bucket.delete(key);
    return;
  }

  const r2 = createS3R2Client();
  if (!r2 || !env.R2_BUCKET_NAME) throw new Error("R2 is not configured.");
  await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
