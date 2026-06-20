import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const uploadRoot = path.join(process.cwd(), ".uploads");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const maxUploadBytes = 10 * 1024 * 1024;

export function isAllowedUpload(mimeType: string, size: number) {
  return allowedMimeTypes.has(mimeType) && size > 0 && size <= maxUploadBytes;
}

export async function saveUpload({
  workspaceId,
  filename,
  mimeType,
  bytes,
}: {
  workspaceId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}) {
  if (!isAllowedUpload(mimeType, bytes.length)) {
    throw new Error("Upload type or size is not allowed.");
  }

  const storageKey = `${workspaceId}/${randomUUID()}-${filename.replace(/[^\w.-]+/g, "_")}`;
  const destination = path.join(uploadRoot, storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);

  return {
    storageKey,
    filename,
    mimeType,
    size: bytes.length,
  };
}

export async function readUpload(storageKey: string) {
  const source = path.join(uploadRoot, storageKey);
  return readFile(source);
}

export function uploadPublicPath(storageKey: string) {
  return `/api/files/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}
