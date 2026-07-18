import { NextResponse } from "next/server";

import { getDb } from "@/lib/db/client";
import { env } from "@/lib/env/server";
import { drainIngestionQueue } from "@/lib/jobs/ingestion";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron processing is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await drainIngestionQueue(getDb(), 10);
  return NextResponse.json({ ok: true, ...result });
}
