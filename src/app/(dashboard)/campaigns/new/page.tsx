import Link from "next/link";

import { ContentLayout } from "@/components/app-nav/content-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaignAction } from "@/features/campaigns/actions";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `New Campaign | ${SITE_NAME}`,
  description: "Create a campaign",
};

export default async function NewCampaignPage() {
  await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="container mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Create campaign</h1>
            <p className="text-sm text-muted-foreground">
              Campaigns scope knowledge and instructions for your widget.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/campaigns" />}>
            Back
          </Button>
        </div>

        <Card className="p-6">
          <form action={createCampaignAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Summer launch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                name="instructions"
                rows={6}
                placeholder="How should the assistant behave for this campaign?"
              />
            </div>
            <Button type="submit">Create campaign</Button>
          </form>
        </Card>
      </div>
    </ContentLayout>
  );
}
