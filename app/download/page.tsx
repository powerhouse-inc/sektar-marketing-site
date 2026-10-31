import type { Metadata } from "next";
import { Placeholder } from "@/components/docs-content";
import { SiteFrame } from "@/components/site-frame";
import { DOWNLOAD_URL } from "@/lib/config";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata(
  "Download",
  "Download the Sektar Desktop App for macOS, Windows or Linux.",
  "/download",
);

export default function Download() {
  return (
    <SiteFrame>
      <main id="top" className="sk-container site-section site-docs__main">
        <article className="site-docs__article">
          <h1>Download Sektar</h1>
          <p>The Sektar Desktop App keeps everything on your computer.</p>
        </article>
        <div className="sk-mt-8">
          <Placeholder>The installers for macOS, Windows and Linux, and what each one needs.</Placeholder>
        </div>
        <div className="site-actions">
          <a className="sk-btn sk-btn--primary" href={DOWNLOAD_URL}>
            Latest release on GitHub
          </a>
        </div>
      </main>
    </SiteFrame>
  );
}
