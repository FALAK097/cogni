import type { Metadata } from "next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";

import { DocsHashScroll } from "@/components/docs/docs-hash-scroll";
import { ThemeLogo } from "@/components/theme-logo";
import { docsSource } from "@/lib/docs-source";

export const metadata: Metadata = {
  title: {
    default: "Documentation",
    template: "%s | Cogni Documentation",
  },
  description:
    "Configure Cogni, keep knowledge current, publish the widget, and operate customer conversations.",
  alternates: {
    canonical: "/docs",
  },
};

const searchLinks: [name: string, href: string][] = [
  ["Getting started", "/docs/getting-started"],
  ["Workspace and permissions", "/docs/workspace-permissions"],
  ["Agent", "/docs/agent"],
  ["Knowledge sources", "/docs/knowledge-sources"],
  ["Widget", "/docs/widget"],
  ["Install the widget", "/docs/widget-installation"],
  ["Widget embed reference", "/docs/widget-embed-reference"],
  ["Inbox and conversations", "/docs/inbox-conversations"],
  ["Integrations and channels", "/docs/integrations-channels"],
  ["Appointment booking", "/docs/booking"],
  ["Analytics", "/docs/analytics"],
];

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider
      search={{
        options: { api: "/api/docs/search" },
        links: searchLinks,
      }}
    >
      <DocsHashScroll />
      <DocsLayout
        tree={docsSource.getPageTree()}
        nav={{
          title: (
            <span className="flex items-center gap-2.5">
              <ThemeLogo showWordmark wordmarkClassName="text-fd-foreground" />
              <span className="hidden text-sm font-medium text-fd-muted-foreground sm:inline">
                Documentation
              </span>
            </span>
          ),
          url: "/",
        }}
        links={[
          { text: "Documentation", url: "/docs", active: "nested-url" },
          { text: "Open Cogni", url: "/inbox", type: "button", secondary: true },
        ]}
        sidebar={{ defaultOpenLevel: 1 }}
        containerProps={{
          className:
            "cogni-docs min-h-svh bg-fd-background text-fd-foreground [&_h1]:text-balance [&_h2]:text-balance [&_p]:text-pretty [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto",
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
