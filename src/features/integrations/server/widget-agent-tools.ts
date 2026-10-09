import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { createApprovalRequest } from "@/features/integrations/server/approval-service";
import { executeApprovedTool } from "@/features/integrations/server/tool-executor";
import type { Db } from "@/lib/db/client";

const availabilityInput = z
  .object({
    startAt: z.iso.datetime().describe("Start of the search window as an ISO timestamp."),
    endAt: z.iso.datetime().describe("End of the search window as an ISO timestamp."),
    timezone: z.string().trim().min(1).max(80).describe("IANA timezone, for example Asia/Kolkata."),
  })
  .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
    message: "The end of the search window must be after its start.",
  });

const bookingInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    attendeeEmail: z.email(),
    timezone: z.string().trim().min(1).max(80),
    description: z.string().trim().max(5_000).optional(),
  })
  .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
    message: "The meeting end time must be after its start.",
  });

export function createWidgetAgentTools({
  db,
  workspaceId,
  conversationId,
  agentRunId,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  agentRunId: string | null;
}) {
  return {
    checkCalendarAvailability: tool({
      description:
        "Check free time in the workspace's connected Google Calendar. Use only after the visitor gives a date range and timezone.",
      inputSchema: availabilityInput,
      execute: async (input) => {
        const action = await executeApprovedTool({
          db,
          workspaceId,
          actionType: "calendar.find_availability",
          input: { ...input, conversationId, calendarIds: ["primary"] },
          idempotencyKey: `widget:availability:${conversationId}:${input.startAt}:${input.endAt}`,
          requestedById: agentRunId ?? `widget:${conversationId}`,
        });
        return {
          status: action.status,
          availability: action.result ? (JSON.parse(action.result) as unknown) : null,
        };
      },
    }),
    requestCalendarBooking: tool({
      description:
        "Request approval to create a Google Calendar meeting. Use only after the visitor explicitly confirms the title, exact times, timezone, and attendee email.",
      inputSchema: bookingInput,
      execute: async (input) => {
        const { approval } = await createApprovalRequest({
          db,
          workspaceId,
          actionType: "calendar.create",
          input: { ...input, conversationId, createMeetingRoom: true },
          summary: `Create ${input.title} with ${input.attendeeEmail} at ${input.startAt}`,
          conversationId,
          agentRunId: agentRunId ?? undefined,
        });
        return {
          status: "PENDING_APPROVAL",
          approvalId: approval.id,
          message: "The workspace team must approve this booking before it is created.",
        };
      },
    }),
  };
}
