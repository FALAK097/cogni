import { z } from "zod";

function hasUnsafeControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0);
    return (
      code !== undefined &&
      (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127)
    );
  });
}

export const inboxMacroInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  content: z
    .string()
    .trim()
    .min(1)
    .max(4_000)
    .refine((content) => !hasUnsafeControlCharacter(content)),
});

export type InboxMacroInput = z.infer<typeof inboxMacroInputSchema>;
