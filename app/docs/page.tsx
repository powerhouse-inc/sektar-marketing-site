import type { Metadata } from "next";
import Link from "next/link";
import { DocsPage } from "@/components/docs-page";
import Overview from "@/docs/index.mdx";
import { DOCS, docsMetadata } from "@/lib/docs";

export const metadata: Metadata = docsMetadata(
  "Documentation",
  "How Sektar works, and what to expect from it.",
  "/docs",
);

export default function DocsOverview() {
  return (
    <DocsPage>
      <Overview />
      <ul className="site-docs__pages">
        {DOCS.map((page) => (
          <li key={page.slug}>
            <Link className="sk-card sk-card--interactive site-docs__page" href={`/docs/${page.slug}`}>
              <h2>{page.title}</h2>
              <p>{page.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </DocsPage>
  );
}
