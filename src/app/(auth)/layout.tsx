import Link from "next/link";
import { ThemeLogo } from "@/components/theme-logo";
import { SupportStory } from "@/components/landing/support-story";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="light grid min-h-svh bg-card text-foreground lg:grid-cols-2">
      <div className="flex min-h-svh flex-col gap-8 px-6 py-8 sm:px-10 lg:px-16">
        <Link href="/" className="w-fit">
          <ThemeLogo showWordmark />
        </Link>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
        <p className="pb-2 text-center text-xs text-muted-foreground">
          Built for helpful conversations.
        </p>
      </div>
      <div className="hidden items-center justify-center border-l border-border bg-cream p-12 lg:flex">
        <div className="w-full max-w-md">
          <h2 className="mb-5 font-display text-5xl leading-[1.08] tracking-tight">
            A helpful answer.
            <br />
            <em>A human connection.</em>
          </h2>
          <p className="mb-9 text-base leading-7 text-muted-foreground">
            Your knowledge, your agent, and your team. Together in one conversation.
          </p>
          <SupportStory compact />
        </div>
      </div>
    </main>
  );
}
