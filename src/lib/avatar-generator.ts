import { blobatarUri } from "blobatar/uri";

interface GenerateAvatarOptions {
  size?: number;
}

/** Local, deterministic SVGs: identity seeds never leave the app. */
export function generateAvatarUrl(seed: string, options: GenerateAvatarOptions = {}) {
  return blobatarUri(seed, { size: options.size ?? 256, background: "circle" });
}

export function generateUserAvatarUrl(email: string, options: GenerateAvatarOptions = {}) {
  return generateAvatarUrl(email, options);
}
