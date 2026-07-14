import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
