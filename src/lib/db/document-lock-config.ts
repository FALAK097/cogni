export function resolveDocumentLockDatabaseUrl(
  databaseUrl: string,
  databaseUrlUnpooled: string | undefined,
) {
  if (databaseUrlUnpooled) return databaseUrlUnpooled;

  const hostname = new URL(databaseUrl).hostname.toLowerCase();
  if (hostname.endsWith(".neon.tech") && hostname.includes("-pooler")) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is required for document advisory locks when DATABASE_URL uses Neon pooling.",
    );
  }

  return databaseUrl;
}
