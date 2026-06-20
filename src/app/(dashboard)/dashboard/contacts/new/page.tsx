import type { Metadata } from "next";

import { NewContactForm } from "@/features/contacts/components/new-contact-form";

export const metadata: Metadata = {
  title: "New contact",
};

export default function NewContactPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <p className="text-sm text-muted-foreground">Contacts</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">New contact</h1>
      </div>
      <NewContactForm />
    </main>
  );
}
