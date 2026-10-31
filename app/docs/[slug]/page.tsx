import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsPage } from "@/components/docs-page";
import { DOCS, docBySlug, docsMetadata } from "@/lib/docs";

type Props = { params: Promise<{ slug: string }> };

// Only the pages lib/docs.ts lists exist.
export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = docBySlug(slug);
  return doc ? docsMetadata(doc.title, doc.description, `/docs/${doc.slug}`) : {};
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  if (!docBySlug(slug)) notFound();
  const { default: Page } = await import(`@/docs/${slug}.mdx`);
  return (
    <DocsPage slug={slug}>
      <Page />
    </DocsPage>
  );
}
