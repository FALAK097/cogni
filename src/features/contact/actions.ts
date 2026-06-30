"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { checkRateLimit } from "@/lib/rate-limit/memory";

export type ContactActionState = {
  error?: string;
  success?: boolean;
};

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  company: z.string().trim().max(120).optional(),
  subject: z.string().trim().min(1, "Enter a subject.").max(120),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(4000),
});

export async function submitContactAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimit = checkRateLimit({ key: `contact:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });

  if (!rateLimit.allowed) {
    return { error: "Too many requests. Please try again later." };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") || undefined,
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  // Hook for email/CRM delivery. Submissions are accepted and logged server-side.
  console.info("[contact]", {
    ...parsed.data,
    submittedAt: new Date().toISOString(),
    ip,
  });

  return { success: true };
}
