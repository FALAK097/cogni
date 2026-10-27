import { cn } from "@/lib/utils";

interface ThemeLogoProps {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function ThemeLogo({ className, showWordmark = false, wordmarkClassName }: ThemeLogoProps) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5" aria-label="cogni">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className={cn("size-8 shrink-0 text-foreground", className)}
        aria-hidden="true"
      >
        <path
          d="M8 3h16a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H13l-6 4v-4a5 5 0 0 1-4-5V8a5 5 0 0 1 5-5Z"
          fill="currentColor"
        />
        <circle cx="11.5" cy="14" r="1.6" className="fill-background" />
        <path
          d="M18 10.5a6 6 0 0 1 5 2.5M18 20a6 6 0 0 0 5-2.5"
          className="stroke-background"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark ? (
        <span className={cn("text-[15px] font-semibold tracking-tight", wordmarkClassName)}>
          cogni
        </span>
      ) : null}
    </span>
  );
}
