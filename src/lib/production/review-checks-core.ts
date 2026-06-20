import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export type ReviewStatus = "pass" | "fail" | "warn";

export type ReviewCheck = {
  id: string;
  category: "security" | "performance" | "readiness";
  label: string;
  status: ReviewStatus;
  detail: string;
};

export type ProductionReviewReport = {
  generatedAt: string;
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
  checks: ReviewCheck[];
};

const root = path.join(/* turbopackIgnore: true */ process.cwd());

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function walkFiles(relativeDir: string, extension: string) {
  const absoluteDir = path.join(root, relativeDir);
  const files: string[] = [];

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(relativePath, extension));
      continue;
    }

    if (entry.name.endsWith(extension)) {
      files.push(relativePath);
    }
  }

  return files;
}

function check(
  id: string,
  category: ReviewCheck["category"],
  label: string,
  passed: boolean,
  detail: string,
  severity: ReviewStatus = "fail",
): ReviewCheck {
  return {
    id,
    category,
    label,
    status: passed ? "pass" : severity,
    detail,
  };
}

function pathExists(relativePath: string) {
  try {
    return statSync(path.join(root, relativePath)).isFile();
  } catch {
    return false;
  }
}

function isR2Configured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY,
  );
}

function isVectorizeConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_API_TOKEN &&
    process.env.VECTORIZE_INDEX,
  );
}

function isCloudflareSearchConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_API_TOKEN &&
    process.env.CLOUDFLARE_SEARCH_INDEX,
  );
}

function runSecurityChecks(): ReviewCheck[] {
  const actionFiles = walkFiles("src/features", ".ts").filter((file) => file.includes("/actions"));
  const missingAuth = actionFiles.filter((file) => {
    const source = read(file);
    if (file.endsWith("actions-members.ts") && source.includes("acceptInviteAction")) {
      return !source.includes("requireDashboardContext") && !source.includes("getAuth");
    }
    return !source.includes("requireDashboardContext");
  });

  const widgetRoutes = [
    "src/app/api/widget/[publicKey]/chat/route.ts",
    "src/app/api/widget/[publicKey]/session/route.ts",
    "src/app/api/widget/[publicKey]/upload/route.ts",
    "src/app/api/widget/[publicKey]/identify/route.ts",
  ];

  const missingRateLimit = widgetRoutes.filter((file) => !read(file).includes("checkRateLimit"));

  const conversationService = read("src/features/conversations/server/conversation-service.ts");
  const internalNotesHidden = conversationService.includes('visibility: "PUBLIC"');

  const envServer = read("src/lib/env/server.ts");
  const noPublicSecrets = !envServer.includes("NEXT_PUBLIC_");
  const authSecretValidated =
    envServer.includes("BETTER_AUTH_SECRET") && envServer.includes(".min(32)");

  const uploadRoute = read("src/app/api/widget/[publicKey]/upload/route.ts");
  const uploadValidated = uploadRoute.includes("isAllowedUpload");

  const middleware = read("src/middleware.ts");
  const requestTracing =
    middleware.includes("x-request-id") || middleware.includes("requestIdHeaderName");

  const chatRoute = read("src/app/api/widget/[publicKey]/chat/route.ts");
  const inputValidated = chatRoute.includes("sanitizeMessages") && chatRoute.includes("4_000");

  return [
    check(
      "security.server-actions-auth",
      "security",
      "Server actions require dashboard auth",
      missingAuth.length === 0,
      missingAuth.length === 0
        ? "All action modules use requireDashboardContext."
        : `Missing auth: ${missingAuth.join(", ")}`,
    ),
    check(
      "security.widget-rate-limits",
      "security",
      "Widget public APIs are rate limited",
      missingRateLimit.length === 0,
      missingRateLimit.length === 0
        ? "Chat, session, upload, and identify routes enforce rate limits."
        : `Missing rate limits: ${missingRateLimit.join(", ")}`,
    ),
    check(
      "security.internal-notes-hidden",
      "security",
      "Internal notes never reach visitors",
      internalNotesHidden,
      internalNotesHidden
        ? "Visitor history loads PUBLIC messages only."
        : "Visitor message loader must filter INTERNAL visibility.",
    ),
    check(
      "security.no-public-secrets",
      "security",
      "Server env schema avoids NEXT_PUBLIC secrets",
      noPublicSecrets,
      noPublicSecrets
        ? "Secrets stay in server env validation."
        : "Move secrets out of NEXT_PUBLIC variables.",
    ),
    check(
      "security.auth-secret-length",
      "security",
      "Auth secret has minimum length validation",
      authSecretValidated,
      authSecretValidated
        ? "BETTER_AUTH_SECRET requires 32+ characters."
        : "Strengthen BETTER_AUTH_SECRET validation.",
    ),
    check(
      "security.upload-validation",
      "security",
      "Upload route validates type and size",
      uploadValidated,
      uploadValidated ? "Widget uploads call isAllowedUpload." : "Add upload type and size checks.",
    ),
    check(
      "security.request-tracing",
      "security",
      "Request tracing middleware is enabled",
      requestTracing,
      requestTracing ? "Middleware attaches request IDs." : "Add request tracing middleware.",
    ),
    check(
      "security.chat-input-validation",
      "security",
      "Widget chat input is validated and bounded",
      inputValidated,
      inputValidated
        ? "Chat route sanitizes and bounds message payloads."
        : "Add chat payload validation.",
    ),
  ];
}

function runPerformanceChecks(): ReviewCheck[] {
  const chatRoute = read("src/app/api/widget/[publicKey]/chat/route.ts");
  const uploadLimits = read("src/lib/storage/local.ts");

  const hasMaxDuration = chatRoute.includes("maxDuration");
  const hasMessageCap = chatRoute.includes("4_000") && chatRoute.includes("50_000");
  const hasHistoryCap = chatRoute.includes("50");
  const hasUploadCap =
    uploadLimits.includes("maxUploadBytes") && uploadLimits.includes("10 * 1024 * 1024");
  const hasContentLength = chatRoute.includes("content-length");

  const inboxActions = read("src/features/inbox/actions.ts");
  const workspaceScoped = inboxActions.includes("workspaceId");

  return [
    check(
      "performance.chat-timeout",
      "performance",
      "Widget chat route declares max duration",
      hasMaxDuration,
      hasMaxDuration
        ? "Chat streaming route sets maxDuration."
        : "Set maxDuration on widget chat route.",
    ),
    check(
      "performance.message-bounds",
      "performance",
      "Widget chat enforces message size limits",
      hasMessageCap,
      hasMessageCap
        ? "Per-message and total payload limits are enforced."
        : "Add message character limits.",
    ),
    check(
      "performance.history-bounds",
      "performance",
      "Widget chat caps message history length",
      hasHistoryCap,
      hasHistoryCap
        ? "Message history is capped before model calls."
        : "Cap message history sent to the model.",
    ),
    check(
      "performance.upload-size-cap",
      "performance",
      "Upload size limit is defined",
      hasUploadCap,
      hasUploadCap ? "Uploads are capped at 10 MB." : "Define and enforce upload size limits.",
    ),
    check(
      "performance.request-size-check",
      "performance",
      "Widget chat checks request content length",
      hasContentLength,
      hasContentLength
        ? "Oversized chat requests are rejected early."
        : "Reject oversized chat requests by content-length.",
    ),
    check(
      "performance.workspace-scoped-queries",
      "performance",
      "Inbox mutations scope queries to workspace",
      workspaceScoped,
      workspaceScoped
        ? "Inbox actions include workspaceId filters."
        : "Scope inbox queries by workspace.",
    ),
  ];
}

function runReadinessChecks(): ReviewCheck[] {
  const envName = process.env.ENV ?? "development";
  const hasVercelConfig = pathExists("vercel.json");
  const vercelSource = hasVercelConfig ? read("vercel.json") : "";
  const deployRunsMigrations = vercelSource.includes("db:deploy");

  const envExample = read(".env.example");
  const requiredEnvDocumented =
    envExample.includes("BETTER_AUTH_SECRET") &&
    envExample.includes("GOOGLE_CLIENT_ID") &&
    envExample.includes("DATABASE_URL");

  const migrationCount = readdirSync(path.join(root, "prisma/migrations")).filter((entry) =>
    entry.includes("_"),
  ).length;

  const hasWidgetLoader = pathExists("src/app/widget.js/route.ts");

  const productionEnvReady =
    envName !== "production" ||
    (Boolean(process.env.BETTER_AUTH_SECRET) &&
      Boolean(process.env.GOOGLE_CLIENT_ID) &&
      Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
      Boolean(process.env.D1_DATABASE_ID));

  const knowledgeReady =
    isR2Configured() && isVectorizeConfigured() && Boolean(process.env.OPENAI_API_KEY);
  const aiReady = Boolean(process.env.OPENAI_API_KEY) || Boolean(process.env.GEMINI_API_KEY);

  return [
    check(
      "readiness.vercel-deploy",
      "readiness",
      "Deployment config runs database migrations",
      hasVercelConfig && deployRunsMigrations,
      hasVercelConfig && deployRunsMigrations
        ? "vercel.json runs pnpm db:deploy before build."
        : "Add vercel.json with migration deploy step.",
    ),
    check(
      "readiness.env-example",
      "readiness",
      "Environment template documents required values",
      requiredEnvDocumented,
      requiredEnvDocumented
        ? ".env.example includes core auth and database vars."
        : "Document required env vars.",
    ),
    check(
      "readiness.migrations",
      "readiness",
      "Prisma migrations are present",
      migrationCount >= 1,
      `${migrationCount} migration(s) found in prisma/migrations.`,
    ),
    check(
      "readiness.widget-loader",
      "readiness",
      "One-line widget loader route exists",
      hasWidgetLoader,
      hasWidgetLoader ? "/widget.js route is available." : "Add the public widget loader route.",
    ),
    check(
      "readiness.production-auth",
      "readiness",
      "Production auth configuration is present",
      productionEnvReady,
      productionEnvReady
        ? envName === "production"
          ? "Production auth and D1 env vars are configured."
          : "Development environment detected."
        : "Set BETTER_AUTH, Google OAuth, and D1 values for production.",
      envName === "production" ? "fail" : "warn",
    ),
    check(
      "readiness.ai-provider",
      "readiness",
      "At least one AI provider key is configured",
      aiReady,
      aiReady
        ? "OpenAI or Gemini provider key is configured."
        : "Configure OPENAI_API_KEY or GEMINI_API_KEY.",
      "warn",
    ),
    check(
      "readiness.knowledge-stack",
      "readiness",
      "Knowledge stack is configured for semantic retrieval",
      knowledgeReady,
      knowledgeReady
        ? "R2, Vectorize, and OpenAI embeddings are configured."
        : "Configure R2, Vectorize, and OPENAI_API_KEY for full knowledge retrieval.",
      "warn",
    ),
    check(
      "readiness.cloudflare-search",
      "readiness",
      "Cloudflare Search index is configured",
      isCloudflareSearchConfigured(),
      isCloudflareSearchConfigured()
        ? "Cloudflare Search index env vars are set."
        : "Optional: configure CLOUDFLARE_SEARCH_INDEX for keyword search.",
      "warn",
    ),
  ];
}

export function runProductionReview(): ProductionReviewReport {
  const checks = [...runSecurityChecks(), ...runPerformanceChecks(), ...runReadinessChecks()];

  const summary = checks.reduce(
    (accumulator, item) => {
      accumulator[item.status] += 1;
      return accumulator;
    },
    { pass: 0, warn: 0, fail: 0 },
  );

  return {
    generatedAt: new Date().toISOString(),
    summary,
    checks,
  };
}

export function isProductionReviewPassing(report: ProductionReviewReport) {
  return report.summary.fail === 0;
}
