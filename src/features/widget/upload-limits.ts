export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_REQUEST_BYTES = MAX_UPLOAD_FILE_BYTES + 64 * 1024;

export function isOversizedUploadRequest(contentLength: string | null): boolean {
  if (!contentLength) return false;
  if (!/^\d+$/.test(contentLength)) return true;
  const normalized = contentLength.replace(/^0+(?=\d)/, "");
  const maximum = String(MAX_UPLOAD_REQUEST_BYTES);
  return (
    normalized.length > maximum.length ||
    (normalized.length === maximum.length && normalized > maximum)
  );
}
