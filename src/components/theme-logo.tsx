"use client";

import Image from "next/image";

interface ThemeLogoProps {
  className?: string;
}

export function ThemeLogo({ className }: ThemeLogoProps) {
  return (
    <>
      <Image
        src="/assets/images/Outcaller_logo.png"
        alt="widget logo"
        width={32}
        height={32}
        className={className}
        priority={true}
      />
    </>
  );
}
