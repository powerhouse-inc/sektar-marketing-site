import { redirect } from "next/navigation";
import { SiteController } from "@/components/site-controller";
import { loadSiteHtml } from "@/lib/site-html";

type Props = { searchParams: Promise<{ env?: string | string[] }> };

export default async function Home({ searchParams }: Props) {
  // A link to someone's environment asks them to sign in first.
  const { env } = await searchParams;
  if (typeof env === "string") redirect(`/login?env=${encodeURIComponent(env)}`);

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
      <SiteController />
    </>
  );
}
