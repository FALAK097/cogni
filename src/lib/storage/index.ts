import "server-only";

import { getR2Object, isR2Configured, putR2Object } from "@/lib/cloudflare/r2";
import {
  isAllowedUpload,
  readUpload as readLocalUpload,
  saveUpload as saveLocalUpload,
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

  const local = await saveLocalUpload({ workspaceId, filename, mimeType, bytes });

  if (isR2Configured()) {
    await putR2Object({
      key: local.storageKey,
      body: bytes,
      contentType: mimeType,
    });
  }

  return local;
}

export async function readObject(storageKey: string) {
  if (isR2Configured()) {
    try {
      return await getR2Object(storageKey);
    } catch {
      return readLocalUpload(storageKey);
    }
  }

  return readLocalUpload(storageKey);
}

export { isAllowedUpload, uploadPublicPath } from "@/lib/storage/local";
