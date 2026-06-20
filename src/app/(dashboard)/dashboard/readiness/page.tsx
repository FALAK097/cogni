import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import {
  isProductionReviewPassing,
  runProductionReview,
  type ReviewCheck,
} from "@/lib/production/review-checks";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Production readiness",
};

function statusVariant(status: ReviewCheck["status"]) {
  if (status === "pass") return "default" as const;
  if (status === "warn") return "secondary" as const;
  return "destructive" as const;
}

function groupChecks(checks: ReviewCheck[], category: ReviewCheck["category"]) {
  return checks.filter((check) => check.category === category);
}

export default async function ReadinessPage() {
  const { membership } = await requireDashboardContext();

  if (membership.role !== "OWNER") {
    redirect("/dashboard/monitoring");
  }

  const report = runProductionReview();
  const passing = isProductionReviewPassing(report);
  const sections = [
    { title: "Security review", category: "security" as const },
    { title: "Performance review", category: "performance" as const },
    { title: "Production customer readiness", category: "readiness" as const },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section>
        <p className="text-sm text-muted-foreground">Launch gate</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Production readiness</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Automated security, performance, and customer-readiness checks for this deployment. Run{" "}
          <code className="font-mono">pnpm review</code> locally or in CI before launch.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <article className="rounded-3xl border p-5 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Overall status</p>
          <p
            className={`mt-2 text-2xl font-semibold ${passing ? "text-emerald-600" : "text-destructive"}`}
          >
            {passing ? "Ready" : "Blocked"}
          </p>
        </article>
        <article className="rounded-3xl border p-5">
          <p className="text-xs text-muted-foreground">Passed</p>
          <p className="mt-2 font-mono text-3xl font-semibold">{report.summary.pass}</p>
        </article>
        <article className="rounded-3xl border p-5">
          <p className="text-xs text-muted-foreground">Warnings</p>
          <p className="mt-2 font-mono text-3xl font-semibold">{report.summary.warn}</p>
        </article>
        <article className="rounded-3xl border p-5">
          <p className="text-xs text-muted-foreground">Failures</p>
          <p className="mt-2 font-mono text-3xl font-semibold">{report.summary.fail}</p>
        </article>
      </section>

      {sections.map((section) => (
        <section key={section.category} className="rounded-3xl border">
          <header className="border-b px-4 py-3">
            <h2 className="font-semibold">{section.title}</h2>
          </header>
          <div className="divide-y">
            {groupChecks(report.checks, section.category).map((check) => (
              <article
                key={check.id}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_6rem]"
              >
                <div>
                  <p className="font-medium">{check.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
                </div>
                <Badge variant={statusVariant(check.status)} className="h-fit justify-self-start">
                  {check.status.toUpperCase()}
                </Badge>
              </article>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-muted-foreground">
        Generated {new Date(report.generatedAt).toLocaleString()}
      </p>
    </main>
  );
}
