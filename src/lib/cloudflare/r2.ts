import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "@/lib/env/server";

let client: S3Client | undefined;

function getR2Client() {
  if (!isR2Configured()) return null;

  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

export function isR2Configured() {
  return Boolean(
    env.CLOUDFLARE_ACCOUNT_ID &&
    env.R2_BUCKET_NAME &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY,
  );
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
  const r2 = getR2Client();
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
  const r2 = getR2Client();
  if (!r2 || !env.R2_BUCKET_NAME) throw new Error("R2 is not configured.");

  const object = await r2.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
  if (!object.Body) throw new Error("R2 object was not found.");
  return Buffer.from(await object.Body.transformToByteArray());
}

export async function deleteR2Object(key: string) {
  const r2 = getR2Client();
  if (!r2 || !env.R2_BUCKET_NAME) throw new Error("R2 is not configured.");
  await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
