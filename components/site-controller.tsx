"use client";

import { useRenownAuthAsync } from "@powerhousedao/reactor-browser/renown";
import { useEffect } from "react";
import { DOWNLOAD_URL, FREE_URL } from "@/lib/config";
import { userOf } from "@/lib/site-user";

/**
 * What every page shares, on the markup rendered verbatim from the design
 * system's site.html (lib/site-html.ts): the header shows the signed-in person,
 * and the home page's "Get started" cards are wired. Signing in itself happens
 * on /login (login-controller.tsx).
 *
 * Renders nothing.
 */
export function SiteController() {
  const user = userOf(useRenownAuthAsync());
  const did = user?.did;
  const initials = user?.initials;

  useEffect(enhanceCards, []);

  useEffect(() => {
    document.body.classList.toggle("is-signed-in", !!did);
    if (!did) return;
    document.querySelectorAll("[data-site-username]").forEach((el) => {
      el.textContent = "Open my Sektar";
    });
    document.querySelectorAll("[data-site-initials]").forEach((el) => {
      el.textContent = initials ?? "";
    });
  }, [did, initials]);

  return null;
}

/**
 * The three "Get started" cards, wired: Free opens Sektar in the browser,
 * "On your own computer" offers the download (and Log in to reach it through
 * its tunnel), "In the cloud" opens the sign-in page on Sektar cloud.
 */
function enhanceCards() {
  const [free, local, cloud] = Array.from(document.querySelectorAll<HTMLElement>(".site-start .site-choice"));
  const disabled = free?.querySelector<HTMLElement>("[aria-disabled]");
  if (disabled) {
    const a = document.createElement("a");
    a.className = disabled.className;
    a.href = FREE_URL;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Open in your browser";
    disabled.replaceWith(a);
  }
  const localLink = local?.querySelector<HTMLAnchorElement>("[data-site-open]");
  if (localLink && !local.querySelector("[data-site-download]")) {
    const a = document.createElement("a");
    a.className = "sk-btn sk-btn--primary";
    a.href = DOWNLOAD_URL;
    a.target = "_blank";
    a.rel = "noopener";
    a.dataset.siteDownload = "";
    a.textContent = "Download";
    localLink.before(a);
    localLink.className = "sk-btn sk-btn--secondary";
    localLink.href = "/login?want=portle";
  }
  const cloudLink = cloud?.querySelector<HTMLAnchorElement>("[data-site-open]");
  if (cloudLink) {
    cloudLink.href = "/login?want=vetra";
    cloudLink.textContent = "Get it in the cloud";
  }
}
