import { Navbar } from "@/components/landing/navbar";
import { EditorialLanding } from "@/components/landing/editorial-landing";
import { Footer } from "@/components/landing/footer";

export const metadata = {
  title: "cogni — AI customer support",
  description:
    "AI customer support grounded in your knowledge, with a branded widget and shared inbox for human handoff.",
};

export default function HomePage() {
  return (
    <main className="light bg-background text-foreground">
      <Navbar />
      <EditorialLanding />
      <Footer />
    </main>
  );
}
