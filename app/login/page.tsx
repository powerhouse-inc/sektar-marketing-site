import type { Metadata } from "next";
import { LoginController } from "@/components/login-controller";
import { SiteFrame } from "@/components/site-frame";
import { pageMetadata } from "@/lib/page-metadata";
import { linkHome, loadSiteHtml } from "@/lib/site-html";

export const metadata: Metadata = {
  ...pageMetadata("Log in", "Sign in with Renown and open your Sektar.", "/login"),
  robots: { index: false },
};

export default function Login() {
  const { login } = loadSiteHtml();
  return (
    <SiteFrame>
      {/* The verbatim sign-in steps of the design system's site prototype. */}
      <main id="top" dangerouslySetInnerHTML={{ __html: linkHome(login) }} />
      <LoginController />
    </SiteFrame>
  );
}
