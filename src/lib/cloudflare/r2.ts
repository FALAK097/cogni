import "server-only";

import { env } from "@/lib/env/server";

export function isR2Configured() {
  return Boolean(
    env.CLOUDFLARE_ACCOUNT_ID &&
    env.R2_BUCKET_NAME &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY,
  );
}

export function getR2Endpoint() {
  if (!env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("Cloudflare account ID is required for R2.");
  }

  return `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
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
  if (
    !isR2Configured() ||
    !env.R2_BUCKET_NAME ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error("R2 is not configured.");
  }

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getR2Object(key: string) {
  if (
    !isR2Configured() ||
    !env.R2_BUCKET_NAME ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error("R2 is not configured.");
  }

  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const response = await client.send(
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
