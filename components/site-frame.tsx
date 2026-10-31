import type { ReactNode } from "react";
import { SiteController } from "@/components/site-controller";
import { linkHome, loadSiteHtml } from "@/lib/site-html";

function Verbatim({ html }: { html: string }) {
  return <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A page away from home, inside the site's own header and footer. */
export function SiteFrame({ children }: { children: ReactNode }) {
  const site = loadSiteHtml();
  return (
    <>
      <Verbatim html={site.preamble} />
      <Verbatim html={linkHome(site.header)} />
      {children}
      <Verbatim html={linkHome(site.footer)} />
      <SiteController />
    </>
  );
}
