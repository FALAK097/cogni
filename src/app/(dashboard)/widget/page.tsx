import { redirect } from "next/navigation";

import { LEGACY_REDIRECTS } from "@/features/navigation/app-routes";

export default function LegacyWidgetPage() {
  redirect(LEGACY_REDIRECTS.widget);
}
