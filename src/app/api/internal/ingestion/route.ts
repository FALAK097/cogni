import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db/client";
import { env } from "@/lib/env/server";
import { processIngestionWorkflowRun } from "@/lib/jobs/ingestion";

export const maxDuration = 300;

const requestSchema = z.object({
  workflowRunId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

function hasValidSecret(request: Request) {
  const expected = env.INGESTION_SHARED_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const actual = authorization.slice("Bearer ".length);
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export async function POST(request: Request) {
  if (!hasValidSecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ingestion job." }, { status: 400 });
  }

  const db = getDb();
  try {
    const result = await processIngestionWorkflowRun({ db, ...parsed.data });
    if (!result.claimed && result.status === "NOT_FOUND") {
      return NextResponse.json({ error: "Ingestion workflow not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const run = await db.query.workflowRun.findFirst({
      where: (fields, { and, eq }) =>
        and(
          eq(fields.id, parsed.data.workflowRunId),
          eq(fields.workspaceId, parsed.data.workspaceId),
        ),
      columns: { status: true },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed." },
      { status: run?.status === "DEAD" ? 422 : 503 },
    );
  }
}
