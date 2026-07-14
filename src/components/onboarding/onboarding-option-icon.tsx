import type { Hugeicon } from "@/components/icons";
import { cn } from "@/lib/utils";

type OnboardingOptionIconProps = {
  label: string;
  logo?: string;
  icon?: Hugeicon;
  size?: number;
  selected?: boolean;
  className?: string;
};

export function OnboardingOptionIcon({
  label,
  logo,
  icon: Icon,
  size = 20,
  selected = false,
  className,
}: OnboardingOptionIconProps) {
  const tileClassName = cn(
    "flex size-9 shrink-0 items-center justify-center rounded-xl border bg-white p-2 shadow-xs",
    "border-border/70",
    selected && "border-white/40 bg-white",
    className,
  );

  if (logo) {
    return (
      <span className={tileClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={`${label} logo`}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  if (!Icon) return null;

  return (
    <span className={tileClassName}>
      <Icon
        size={size}
        className={cn("shrink-0", selected ? "text-primary" : "text-muted-foreground")}
      />
    </span>
  );
}
