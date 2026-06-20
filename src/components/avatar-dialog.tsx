"use client";

import type { ReactNode } from "react";

export function AvatarDialog({
  children,
}: {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currentAvatar?: string;
  onAvatarUpdate?: (avatar: string) => void;
}) {
  return <>{children}</>;
}
