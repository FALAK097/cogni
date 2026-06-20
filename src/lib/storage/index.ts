import "server-only";

import { deleteR2Object, getR2Object, isR2Configured, putR2Object } from "@/lib/cloudflare/r2";
import { env } from "@/lib/env/server";
import {
  createStorageKey,
  deleteUpload,
  isAllowedUpload,
  isAllowedKnowledgeUpload,
  readUpload as readLocalUpload,
  saveUpload as saveLocalUpload,
  uploadPublicPath,
} from "@/lib/storage/local";

export async function saveObject({
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

  if (env.ENV === "production") {
    if (!isR2Configured()) {
      throw new Error("R2 must be configured in production.");
    }

    const storageKey = createStorageKey(workspaceId, filename);
    await putR2Object({
      key: storageKey,
      body: bytes,
      contentType: mimeType,
    });

    return {
      storageKey,
      filename,
      mimeType,
      size: bytes.length,
    };
  }

  return saveLocalUpload({ workspaceId, filename, mimeType, bytes });
}

export async function readObject(storageKey: string) {
  if (env.ENV === "production") {
    if (!isR2Configured()) {
      throw new Error("R2 must be configured in production.");
    }
    return getR2Object(storageKey);
  }

  return readLocalUpload(storageKey);
}

export async function deleteObject(storageKey: string) {
  if (env.ENV === "production") {
    if (!isR2Configured()) {
      throw new Error("R2 must be configured in production.");
    }
    await deleteR2Object(storageKey);
    return;
  }

  await deleteUpload(storageKey);
}

export { isAllowedUpload, isAllowedKnowledgeUpload, uploadPublicPath };
