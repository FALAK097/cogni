import { generateAvatarUrl } from "@/lib/avatar-generator";
import { ThemeLogo } from "@/components/theme-logo";

/** Fictional conversation used only on public pages, never mixed with workspace data. */
export function SupportStory({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_16px_48px_-24px_rgba(40,38,36,0.18)]">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <ThemeLogo className="size-6" />
          <span className="text-sm font-medium">Atlas support</span>
        </div>
        <span className="rounded-full bg-success-muted px-2.5 py-1 text-xs text-success">
          Human connected
        </span>
      </div>
      <div className="space-y-6 p-5 sm:p-7">
        <p className="text-center text-xs text-muted-foreground">Example conversation</p>
        <div className="flex items-start gap-3">
          {/* Locally generated decorative identity for this fictional example. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={generateAvatarUrl("atlas alex")}
            alt=""
            width={32}
            height={32}
            className="shrink-0 rounded-full"
          />
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Alex · Customer</p>
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6">
              How do I export my workspace?
            </p>
          </div>
        </div>
        <div className="ml-8 space-y-2 sm:ml-12">
          <p className="text-right text-xs text-muted-foreground">Cogni · AI agent</p>
          <div className="rounded-2xl bg-cream px-4 py-3 text-sm leading-6">
            Open Settings, then choose Export data. You can download your workspace as a CSV.
            <span className="mt-3 block border-t border-border pt-2 text-xs text-muted-foreground">
              ↗ Source: Exporting your workspace
            </span>
          </div>
        </div>
        {!compact && (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generateAvatarUrl("atlas alex")}
              alt=""
              width={32}
              height={32}
              className="shrink-0 rounded-full"
            />
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6">
              Could someone help me with a custom export?
            </p>
          </div>
        )}
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          Assigned to Maya · AI paused
        </p>
        <div className="ml-8 flex flex-row-reverse items-start gap-3 sm:ml-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={generateAvatarUrl("atlas maya")}
            alt=""
            width={32}
            height={32}
            className="shrink-0 rounded-full"
          />
          <div>
            <p className="mb-2 text-right text-xs text-muted-foreground">Maya · Teammate</p>
            <p className="rounded-2xl bg-cream px-4 py-3 text-sm leading-6">
              Absolutely. I have the conversation here. What would you like to include?
            </p>
          </div>
        </div>
      </div>
      {!compact && (
        <div className="m-4 mt-0 flex items-center justify-between rounded-xl border border-input px-4 py-3 text-sm text-muted-foreground">
          <span>Reply to Alex…</span>
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            ↑
          </span>
        </div>
      )}
    </div>
  );
}
