"use client";

import { useTheme } from "next-themes";
import Image from "next/image";

import { cn } from "@/lib/utils";

type IntegrationIconProps = {
  src: string;
  alt: string;
  iconDark?: string;
  background?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: { wrapper: "h-8 w-8", img: 28 },
  md: { wrapper: "h-10 w-10", img: 36 },
  lg: { wrapper: "h-12 w-12", img: 44 },
} as const;

/**
 * Renders a clean integration icon without a background tile.
 * Automatically selects dark variant icon for dark theme if available.
 * The brand color tile has been intentionally removed for a cleaner look.
 */
export function IntegrationIcon({
  src,
  alt,
  iconDark,
  background: _background,
  size = "md",
  className,
}: IntegrationIconProps) {
  const { resolvedTheme } = useTheme();
  const { wrapper, img } = sizeMap[size];

  const resolvedSrc = resolvedTheme === "dark" && iconDark ? iconDark : src;

  return (
    <div className={cn("flex shrink-0 items-center justify-center", wrapper, className)}>
      <Image
        src={resolvedSrc}
        alt={alt}
        width={img}
        height={img}
        className="h-full w-auto max-w-full object-contain shrink-0"
      />
    </div>
  );
}
