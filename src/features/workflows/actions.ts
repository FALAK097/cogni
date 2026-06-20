"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { startWorkflowRun } from "@/lib/workflows/runner";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const retrySchema = z.object({
  workflowRunId: z.string().min(1),
});

export async function retryWorkflowRunAction(formData: FormData) {
  const parsed = retrySchema.safeParse({
    workflowRunId: formData.get("workflowRunId"),
  });

  if (!parsed.success) {
    return;
  }

  const { db, workspace } = await requireDashboardContext();
  const run = await db.workflowRun.findFirst({
    where: {
      id: parsed.data.workflowRunId,
      workspaceId: workspace.id,
      status: { in: ["FAILED", "DEAD"] },
    },
  });

  if (!run) {
    return;
  }

  await db.workflowRun.update({
    where: { id: run.id },
    data: {
      status: "RUNNING",
      errorMessage: null,
      finishedAt: null,
    },
  });

  await startWorkflowRun({
    db,
    workspaceId: workspace.id,
    name: `${run.name}.retry`,
    idempotencyKey: `${run.idempotencyKey ?? run.id}:retry:${Date.now()}`,
    input: JSON.parse(run.input) as Record<string, unknown>,
  });

  revalidatePath("/dashboard/workflows");
}
