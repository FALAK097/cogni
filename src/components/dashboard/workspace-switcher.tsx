"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { switchWorkspaceAction } from "@/features/workspaces/actions-members";

type WorkspaceOption = {
  workspaceId: string;
  name: string;
  role: string;
};

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(activeWorkspaceId);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const returnTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  return (
    <form
      ref={formRef}
      action={switchWorkspaceAction}
      className="group-data-[collapsible=icon]:hidden"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="sr-only" htmlFor="workspace-switcher">
        Switch workspace
      </label>
      <select
        id="workspace-switcher"
        name="workspaceId"
        value={selectedWorkspaceId}
        disabled={pending}
        className="mt-1 h-8 w-full rounded-lg border bg-background px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
        onChange={(event) => {
          const nextWorkspaceId = event.target.value;
          setSelectedWorkspaceId(nextWorkspaceId);
          startTransition(() => {
            formRef.current?.requestSubmit();
          });
        }}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.workspaceId} value={workspace.workspaceId}>
            {workspace.name} ({workspace.role})
          </option>
        ))}
      </select>
    </form>
  );
}
