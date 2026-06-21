import { MessageCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

interface ThemeLogoProps {
  className?: string;
}

export function ThemeLogo({ className }: ThemeLogoProps) {
  return (
    <span
      aria-label="Widget"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
    >
      <MessageCircle className="size-4" aria-hidden="true" />
    </span>
  );
}
