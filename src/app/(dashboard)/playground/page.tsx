import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/features/navigation/app-routes";

export default function LegacyPlaygroundPage() {
  redirect(APP_ROUTES.agent);
}
