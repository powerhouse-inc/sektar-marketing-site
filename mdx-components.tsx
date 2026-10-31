import type { MDXComponents } from "mdx/types";
import { DocsTable, Placeholder, Planned, SectionHeading } from "@/components/docs-content";

const components: MDXComponents = {
  h2: SectionHeading,
  table: DocsTable,
  Placeholder,
  Planned,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
