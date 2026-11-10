import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign Up",
  description: "Create your cogni workspace.",
};

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create an account</h1>
        <p className="text-[15px] text-gray-500">Get started with your cogni workspace.</p>
      </div>

      <AuthForm mode="sign-up" />
    </div>
  );
}
