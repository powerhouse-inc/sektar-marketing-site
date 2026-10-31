import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { DOCS } from "@/lib/docs";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/download`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/docs`, changeFrequency: "weekly", priority: 0.5 },
    ...DOCS.map((doc) => ({
      url: `${SITE_URL}/docs/${doc.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
