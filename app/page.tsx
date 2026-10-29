import { SiteController } from "@/components/site-controller";
import { loadSiteHtml } from "@/lib/site-html";

export default function Home() {
  const site = loadSiteHtml();
  return (
    <>
      {/* The verbatim sections of the design system's site prototype. Trusted,
          build-time content; `display: contents` keeps the wrappers out of the
          layout, so the sticky header still sticks to the page. */}
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: site.preamble }} />
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: site.header }} />
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: site.main }} />
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: site.footer }} />
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: site.dialog }} />
      <SiteController />
    </>
  );
}
