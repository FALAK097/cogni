export function resolveDocumentLockDatabaseUrl(
  databaseUrl: string,
  databaseUrlUnpooled: string | undefined,
) {
  if (databaseUrlUnpooled) return databaseUrlUnpooled;
  if (!databaseUrl) return "postgresql://cogni:cogni@127.0.0.1:5432/cogni";

  try {
    const hostname = new URL(databaseUrl).hostname.toLowerCase();
    if (hostname.endsWith(".neon.tech") && hostname.includes("-pooler")) {
      throw new Error(
        "DATABASE_URL_UNPOOLED is required for document advisory locks when DATABASE_URL uses Neon pooling.",
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("DATABASE_URL_UNPOOLED is required")) {
      throw error;
    }
  }

  return databaseUrl;
}
