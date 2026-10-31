import { SiteFrame } from "@/components/site-frame";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
