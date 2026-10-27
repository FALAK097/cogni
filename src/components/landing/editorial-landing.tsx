import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button-variants";
import { SupportStory } from "./support-story";
import { getAllIntegrations } from "@/features/integrations/registry";
import { cn } from "@/lib/utils";

const heading = "font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl";
const container = "mx-auto w-full max-w-[1120px] px-6 sm:px-10";
const faqs = [
  [
    "What does Cogni answer from?",
    "Your knowledge base. Add website pages, documents, or written answers, then test the agent against the questions your customers actually ask.",
  ],
  [
    "Can a customer still talk to a person?",
    "Yes. Customers can ask for a teammate. Your team receives the conversation in the shared inbox, with the message history intact. AI pauses while a teammate takes over.",
  ],
  [
    "Can I make the widget feel like my product?",
    "Yes. Customize its appearance, greeting, suggested questions, and behavior. Preview your changes, then publish the version you want customers to use.",
  ],
  [
    "How do connections work?",
    "Connect supported services in workspace settings. Each connection has its own credentials, permissions, and setup requirements. Messaging channels also require provider configuration.",
  ],
  [
    "Will changes go live as soon as I edit them?",
    "Agent edits save as a draft. Test and preview that draft before publishing. An installed widget keeps using the published version until you publish changes.",
  ],
] as const;

export function EditorialLanding() {
  return (
    <>
      <section className={cn(container, "pb-20 pt-20 text-center sm:pb-28 sm:pt-28")}>
        <p className="mb-6 text-sm text-muted-foreground">A little more help. A lot more human.</p>
        <h1 className="font-display text-[3.5rem] leading-[1.02] tracking-tight sm:text-7xl lg:text-[88px]">
          Good answers.
          <br />
          <em>Great handoffs.</em>
        </h1>
        <p className="mx-auto mt-7 max-w-[520px] text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          AI support that learns from your knowledge. A shared inbox that keeps your team in the
          conversation.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sign-in" className={cn(buttonVariants({ size: "lg" }), "px-7")}>
            Get started <span aria-hidden="true">↗</span>
          </Link>
          <a
            href="#how-it-works"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-card px-7")}
          >
            See how it works
          </a>
        </div>
        <div className="relative mx-auto mt-14 max-w-[900px] rounded-[28px] border border-border bg-cream p-3 sm:mt-20 sm:p-7">
          <div className="grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[200px_1fr]">
            <aside className="hidden border-r bg-background p-5 text-left md:block">
              <p className="mb-8 text-sm font-medium">Atlas workspace</p>
              <p className="mb-3 rounded-xl bg-secondary px-3 py-2.5 text-sm">
                ◉ Inbox <span className="float-right text-muted-foreground">3</span>
              </p>
              <p className="px-3 py-2.5 text-sm text-muted-foreground">◇ Agent</p>
              <p className="px-3 py-2.5 text-sm text-muted-foreground">▥ Insights</p>
              <p className="mb-4 mt-10 text-xs text-muted-foreground">Your views</p>
              <p className="px-3 py-2 text-sm text-muted-foreground">Assigned to me</p>
              <p className="px-3 py-2 text-sm text-muted-foreground">Needs a human</p>
              <p className="px-3 py-2 text-sm text-muted-foreground">Resolved</p>
            </aside>
            <div className="p-3 sm:p-5">
              <SupportStory />
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            An example of the support loop. Fictional workspace and messages.
          </p>
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-24 border-y border-border bg-cream py-20 sm:py-28"
      >
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-2 lg:gap-20")}>
          <div>
            <p className="mb-5 text-sm text-muted-foreground">KNOWLEDGE, PUT TO WORK</p>
            <h2 className={heading}>
              Your knowledge.
              <br />
              <em>Its starting point.</em>
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              Bring in the pages, documents, and answers your team already relies on. Give your
              agent useful context before it meets a customer.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              <li>↗ Import website pages and documents</li>
              <li>↗ Review source status and readiness</li>
              <li>↗ Test real questions before publishing</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-[#282624] p-6 text-[#f8f6f0] sm:p-9">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-sm">Knowledge base</span>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs">
                Example sources
              </span>
            </div>
            {[
              ["Exporting your workspace", "Website page"],
              ["Getting started with Atlas", "Document"],
              ["Can I invite my team?", "Written answer"],
            ].map(([name, type]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-4 border-t border-white/15 py-5"
              >
                <div>
                  <p className="text-sm">{name}</p>
                  <p className="mt-1.5 text-xs text-white/60">{type}</p>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-[#b9dfc8]">
                  Ready
                </span>
              </div>
            ))}
            <p className="mt-7 text-xs leading-5 text-white/60">
              Better source material gives your agent a better foundation.
            </p>
          </div>
        </div>
      </section>

      <section
        className={cn(
          container,
          "grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20",
        )}
      >
        <div className="rounded-[28px] bg-muted p-5 sm:p-8">
          <SupportStory compact />
        </div>
        <div>
          <p className="mb-5 text-sm text-muted-foreground">ONE CONVERSATION, ALL THE CONTEXT</p>
          <h2 className={heading}>
            AI when it helps.
            <br />
            <em>You when it matters.</em>
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            Some questions need a human. Pick up right where the agent left off, with the
            conversation, customer details, and source context in one place.
          </p>
          <div className="mt-8 border-t border-border pt-6">
            <p className="text-sm font-medium">A quieter inbox. A clearer next step.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Assign conversations, leave internal notes, use saved replies, and build views that
              match your team’s workflow.
            </p>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 border-y border-border bg-cream py-20 sm:py-28"
      >
        <div className={container}>
          <div className="max-w-xl">
            <p className="mb-5 text-sm text-muted-foreground">
              FROM FIRST SOURCE TO FIRST CONVERSATION
            </p>
            <h2 className={heading}>
              Make it yours.
              <br />
              <em>Then make it live.</em>
            </h2>
          </div>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {[
              [
                "01",
                "Build its knowledge",
                "Add sources, set instructions, and decide when your agent should bring in a teammate.",
              ],
              [
                "02",
                "Put it to the test",
                "Try customer questions, review answers and sources, and refine the draft.",
              ],
              [
                "03",
                "Publish with confidence",
                "Customize the widget, authorize your domains, and install it on your site.",
              ],
            ].map(([number, title, copy]) => (
              <li key={number} className="border-t border-input pt-5">
                <span className="text-xs text-muted-foreground">{number}</span>
                <h3 className="mb-3 mt-6 text-lg font-medium">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="integrations"
        className={cn(
          container,
          "scroll-mt-24 grid gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20",
        )}
      >
        <div>
          <p className="mb-5 text-sm text-muted-foreground">A PLACE IN YOUR STACK</p>
          <h2 className={heading}>
            Works alongside
            <br />
            <em>your everyday tools.</em>
          </h2>
          <p className="mt-6 text-base leading-7 text-muted-foreground">
            Connect supported services for agent actions and team workflows. Set up each connection
            with the permissions and provider configuration it needs.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {getAllIntegrations()
            .filter((item) => !item.isComingSoon)
            .map((item) => (
              <div
                key={item.slug}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4"
              >
                <Image
                  src={item.icon}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 object-contain"
                  unoptimized
                />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
            ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 border-t border-border py-20 sm:py-28">
        <div className={cn(container, "grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-20")}>
          <h2 className={heading}>
            A few things
            <br />
            <em>you might ask.</em>
          </h2>
          <div>
            {faqs.map(([question, answer]) => (
              <details key={question} className="group border-b border-border py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-medium [&::-webkit-details-marker]:hidden">
                  {question}
                  <span aria-hidden="true" className="text-lg font-normal group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 pr-6 text-sm leading-7 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-cream px-6 py-20 text-center sm:py-28">
        <h2 className={heading}>
          Less friction.
          <br />
          <em>More conversation.</em>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-base leading-7 text-muted-foreground">
          Give your customers a helpful first answer.
          <br />
          Give your team the context to take it from there.
        </p>
        <Link href="/sign-in" className={cn(buttonVariants({ size: "lg" }), "mt-8 px-7")}>
          Get started <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </>
  );
}
