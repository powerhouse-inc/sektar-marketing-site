import type { Metadata } from "next";

/** A page's metadata. The root layout's canonical URL and Open Graph block
    describe the home page, and Next replaces them whole, so all of it is set. */
export function pageMetadata(
  title: string,
  description: string,
  path: string,
  site = "Sektar",
): Metadata {
  return {
    title: `${title} · ${site}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: "Sektar",
      title,
      description,
      images: [{ url: "/sk/assets/photos/laptop-workspace-with-coffee.jpg" }],
    },
  };
}
