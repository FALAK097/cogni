import { redirect } from "next/navigation";

// Sign-up is handled by the same Google OAuth flow as sign-in.
// Redirect all /sign-up traffic to /sign-in.
export default function SignUpPage() {
  redirect("/sign-in");
}
