"use client";

import { assignConversationAction } from "@/features/inbox/actions";

export function AssignmentControl({
  conversationId,
  members,
  assignedMembershipId,
}: {
  conversationId: string;
  assignedMembershipId: string | null;
  members: {
    id: string;
    role: string;
    user: {
      name: string;
    };
  }[];
}) {
  return (
    <form
      action={assignConversationAction}
      className="flex items-center gap-2"
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement && event.target.name === "membershipId") {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <label className="sr-only" htmlFor={`assignee-${conversationId}`}>
        Assignee
      </label>
      <select
        id={`assignee-${conversationId}`}
        name="membershipId"
        defaultValue={assignedMembershipId ?? ""}
        className="h-9 w-full min-w-44 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <option value="" disabled>
          Select teammate
        </option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.user.name}
            {member.role === "OWNER" ? " (Owner)" : ""}
          </option>
        ))}
      </select>
    </form>
  );
}
