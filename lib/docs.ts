import { pageMetadata } from "@/lib/page-metadata";

/* The documentation's pages, in reading order. Each one is docs/<slug>.mdx; how
   these pages relate to the product is in docs/README.md. */

export type DocPage = {
  slug: string;
  title: string;
  description: string;
  /** Shows the notice that the page is still being written. */
  preliminary?: boolean;
};

export const DOCS: readonly DocPage[] = [
  {
    slug: "where-sektar-runs",
    title: "Where Sektar runs",
    description:
      "The Sektar Desktop App, Sektar Cloud and Self-hosted Sektar compared: who runs each one, and where your documents are.",
    preliminary: true,
  },
];

export const docBySlug = (slug: string) => DOCS.find((doc) => doc.slug === slug);

export const docsMetadata = (title: string, description: string, path: string) =>
  pageMetadata(title, description, path, "Sektar docs");
