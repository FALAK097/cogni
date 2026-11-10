import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Integrations } from "@/components/landing/integrations";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export const metadata = {
  title: "cogni — AI customer support",
  description:
    "AI customer support grounded in your knowledge, with a branded widget and shared inbox for human handoff.",
};

export default function HomePage() {
  return (
    <main className="light overflow-x-hidden bg-white text-gray-900">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Integrations />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
