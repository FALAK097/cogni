"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createWorkspaceAction,
  type CreateWorkspaceState,
} from "@/features/workspaces/create-workspace-action";

const initialState: CreateWorkspaceState = {};

export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createWorkspaceAction, initialState);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-create-workspace", handleOpen);
    return () => window.removeEventListener("open-create-workspace", handleOpen);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            A new workspace starts with a fresh setup flow for your agents and knowledge base.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input id="workspace-name" name="name" placeholder="Acme Support" required />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
