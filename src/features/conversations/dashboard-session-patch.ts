import { z } from "zod";

export const DASHBOARD_SESSION_PATCH_MAX_BYTES = 48 * 1024;
export const DASHBOARD_SESSION_MESSAGE_MAX_LENGTH = 10_000;

export const dashboardSessionPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign") }).strict(),
  z
    .object({
      action: z.literal("reply"),
      message: z.string().trim().min(1).max(DASHBOARD_SESSION_MESSAGE_MAX_LENGTH),
    })
    .strict(),
  z
    .object({
      action: z.literal("note"),
      message: z.string().trim().min(1).max(DASHBOARD_SESSION_MESSAGE_MAX_LENGTH),
    })
    .strict(),
]);
