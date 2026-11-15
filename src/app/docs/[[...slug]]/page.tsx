import type { Metadata } from "next";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { notFound } from "next/navigation";

import { getMDXComponents } from "../../../../mdx-components";
import { docsSource } from "@/lib/docs-source";

const SITE_URL = "https://cogni.falakgala.dev";

type DocumentationPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return docsSource.generateParams();
}

export async function generateMetadata({ params }: DocumentationPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const page = docsSource.getPage(slug);
  if (!page) return {};

  const path = page.slugs.length === 0 ? "/docs" : `/docs/${page.slugs.join("/")}`;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: `${SITE_URL}${path}`,
      title: `${page.data.title} | Cogni Documentation`,
      description: page.data.description,
    },
    twitter: {
      card: "summary",
      title: `${page.data.title} | Cogni Documentation`,
      description: page.data.description,
    },
  };
}

export default async function DocumentationPage({ params }: DocumentationPageProps) {
  const { slug = [] } = await params;
  const page = docsSource.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(docsSource, page) })} />
      </DocsBody>
    </DocsPage>
  );
}
