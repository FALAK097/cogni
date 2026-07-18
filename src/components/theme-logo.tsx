import Image from "next/image";
import { cn } from "@/lib/utils";

interface ThemeLogoProps {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function ThemeLogo({ className, showWordmark = false, wordmarkClassName }: ThemeLogoProps) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5" aria-label="cogni">
      <Image
        src="/assets/cogni.png"
        alt=""
        width={40}
        height={40}
        className={cn("size-8 object-contain", className)}
        aria-hidden="true"
      />
      {showWordmark ? (
        <span className={cn("text-[15px] font-semibold tracking-tight", wordmarkClassName)}>
          cogni
        </span>
      ) : null}
    </span>
  );
}
