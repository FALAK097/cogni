"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Icons } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";
import { useCampaigns, useCloneCampaign, useDeleteCampaign } from "@/hooks/query";

type CampaignItem = {
  id: string;
  name: string;
  description?: string | null;
  type?: string;
  escalationEnabled?: boolean;
  inboundNumber?: string | null;
  agent?: { name?: string | null } | null;
  _count?: {
    campaignAgents?: number;
    leads?: number;
  };
};

const CAMPAIGN_DESCRIPTION_PREVIEW_LIMIT = 140;

const typeLabels: Record<string, string> = {
  ONE_WAY: "One-way",
  OUTBOUND: "Outbound",
  INBOUND: "Inbound",
};

const truncateText = (value: string | null | undefined, limit: number) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit - 1).trimEnd()}...`;
};

export function CampaignList() {
  const router = useRouter();
  const [ui, setUi] = useState<{
    searchQuery: string;
    selectedCampaignId: string | null;
    deletingCampaign: CampaignItem | null;
    isDeleting: boolean;
    isCloning: boolean;
  }>({
    searchQuery: "",
    selectedCampaignId: null,
    deletingCampaign: null,
    isDeleting: false,
    isCloning: false,
  });
  const { searchQuery, selectedCampaignId, deletingCampaign, isDeleting, isCloning } = ui;
  const campaignsQuery = useCampaigns();
  const deleteCampaignMutation = useDeleteCampaign();
  const cloneCampaignMutation = useCloneCampaign();
  const campaigns: CampaignItem[] =
    (campaignsQuery.data as unknown as { campaigns?: CampaignItem[] } | undefined)?.campaigns || [];
  const loading = campaignsQuery.isLoading;

  const handleDelete = async () => {
    if (!deletingCampaign) return;
    try {
      setUi((current) => ({ ...current, isDeleting: true }));
      await deleteCampaignMutation.mutateAsync(deletingCampaign.id);
      toast({ title: "Success", description: "Campaign deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete campaign", variant: "destructive" });
    }
    setUi((current) => ({ ...current, isDeleting: false, deletingCampaign: null }));
  };

  const handleClone = async () => {
    if (!selectedCampaignId) return;
    try {
      setUi((current) => ({ ...current, isCloning: true }));
      await cloneCampaignMutation.mutateAsync(selectedCampaignId);
      toast({ title: "Success", description: "Campaign cloned" });
      setUi((current) => ({ ...current, selectedCampaignId: null }));
    } catch {
      toast({ title: "Error", description: "Failed to clone campaign", variant: "destructive" });
    }
    setUi((current) => ({ ...current, isCloning: false }));
  };

  const filteredCampaigns = campaigns.filter((uc) =>
    [uc.name, uc.description, uc.agent?.name]
      .filter(Boolean)
      .some((v) => (v as string).toLowerCase().includes(searchQuery.toLowerCase())),
  );

  if (loading) {
    return (
      <div className="w-full mt-8">
        <div className="border rounded-md">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <th key={i} className="p-4 text-left">
                    <span className="sr-only">Loading column {i}</span>
                    <div className="h-4 w-[100px] animate-pulse bg-muted/60 rounded-md" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => (
                <tr key={i} className="border-b">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <td key={j} className="p-4" aria-label={`Loading row ${i}, column ${j}`}>
                      <div className="h-4 w-[100px] animate-pulse bg-muted/60 rounded-md" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!campaigns.length) {
    return (
      <div className="p-4 mt-4 space-y-4 rounded-lg">
        <EmptyState
          icon={Icons.clipboardList}
          title="Create your first campaign"
          description="Campaigns define calling workflows for your agents. Create one to get started with outbound or inbound calling."
        >
          <Button onClick={() => router.push("/campaigns/new")} className="mt-4">
            <Icons.plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(event) =>
              setUi((current) => ({ ...current, searchQuery: event.target.value }))
            }
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!selectedCampaignId || isCloning}
            onClick={handleClone}
          >
            <Icons.copy className="w-4 h-4 mr-2" />
            {isCloning ? "Cloning..." : "Clone"}
          </Button>
          <Button onClick={() => router.push("/campaigns/new")}>
            <Icons.plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.map((uc) => (
              <TableRow
                key={uc.id}
                className="cursor-pointer"
                onClick={() => router.push(`/campaigns/${uc.id}`)}
              >
                <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedCampaignId === uc.id}
                    onCheckedChange={(checked) =>
                      setUi((current) => ({
                        ...current,
                        selectedCampaignId: checked ? uc.id : null,
                      }))
                    }
                    aria-label={`Select ${uc.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{uc.name}</div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[360px]">
                  {uc.description ? (
                    <div
                      className="text-sm text-muted-foreground line-clamp-2"
                      title={uc.description}
                    >
                      {truncateText(uc.description, CAMPAIGN_DESCRIPTION_PREVIEW_LIMIT)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[uc.type || "OUTBOUND"] || uc.type || "OUTBOUND"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div
                    className="max-w-[180px] truncate text-sm"
                    title={uc.agent?.name || undefined}
                  >
                    {uc.agent?.name || "No agent"}
                  </div>
                </TableCell>
                <TableCell className="text-center">{uc._count?.leads ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/campaigns/new?edit=${uc.id}`);
                              }}
                            >
                              <Icons.pencil className="h-4 w-4" />
                              <span className="sr-only">Edit campaign</span>
                            </Button>
                          }
                        />
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                setUi((current) => ({ ...current, deletingCampaign: uc }));
                              }}
                            >
                              <Icons.trash className="h-4 w-4" />
                              <span className="sr-only">Delete campaign</span>
                            </Button>
                          }
                        />
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deletingCampaign}
        onOpenChange={(open) =>
          !open && setUi((current) => ({ ...current, deletingCampaign: null }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCampaign?.name}&quot;? This will
              unassign all leads and remove associated escalation links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
