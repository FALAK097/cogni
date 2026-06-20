import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentLayout } from "@/components/app-nav/content-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCampaignAction } from "@/features/campaigns/actions";
import { getCampaignById } from "@/features/campaigns/server/campaign-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Campaign ${id} | ${SITE_NAME}` };
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { db, workspace } = await requireDashboardContext();
  const { id } = await params;
  const campaign = await getCampaignById(db, workspace.id, id);

  if (!campaign) {
    notFound();
  }

  return (
    <ContentLayout>
      <div className="container mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">
              {campaign.documents.length} knowledge sources linked
            </p>
          </div>
          <Button variant="outline" render={<Link href="/campaigns" />}>
            Back
          </Button>
        </div>

        <Card className="p-6">
          <form action={updateCampaignAction} className="space-y-4">
            <input type="hidden" name="campaignId" value={campaign.id} />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={campaign.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={campaign.description ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                name="instructions"
                rows={8}
                defaultValue={campaign.instructions ?? ""}
              />
            </div>
            <Button type="submit">Save campaign</Button>
          </form>
        </Card>
      </div>
    </ContentLayout>
  );
}
