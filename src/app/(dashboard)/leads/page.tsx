import type { Metadata } from "next";

import { ContentLayout } from "@/components/app-nav/content-layout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listWorkspaceLeads } from "@/features/leads/server/lead-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Leads | ${SITE_NAME}`,
  description: "Leads captured by the embedded widget",
};

export default async function LeadsPage() {
  const { db, workspace } = await requireDashboardContext();
  const { items, total } = await listWorkspaceLeads(db, workspace.id, { limit: 50 });

  return (
    <ContentLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm text-muted-foreground">Widget lead capture</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
            <Badge variant="secondary">{total}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Only contacts submitted through an active widget conversation appear here.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Captured</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No leads captured yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.email ?? "—"}</TableCell>
                    <TableCell>{lead.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.status}</Badge>
                    </TableCell>
                    <TableCell>{lead.createdAt.toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </ContentLayout>
  );
}
