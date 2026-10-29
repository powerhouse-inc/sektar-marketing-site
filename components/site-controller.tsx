"use client";

import {
  useRenown,
  useRenownAuthAsync,
  type RenownAuthAsync,
} from "@powerhousedao/reactor-browser/renown";
import { useEffect, useRef } from "react";
import {
  answers,
  cloudAffixes,
  envFromLink,
  forget,
  fromDirectory,
  knownEnvs,
  redeemCloud,
  remember,
  typedEnv,
  type EnvKind,
  type Environment,
} from "@/lib/environments";
import { DOWNLOAD_URL, FREE_URL } from "@/lib/config";

/* The card a visitor chose ("cloud" opens the dialog on Sektar cloud); kept
   across the Renown redirect in sessionStorage. */
const WANT_KEY = "sektar.site.want";
/* How long the site waits for a new cloud Sektar to be set up and running. */
const CLOUD_WAIT_MS = 15 * 60 * 1000;
const CLOUD_POLL_MS = 10 * 1000;

/**
 * The site's behaviour, on the markup rendered verbatim from the design
 * system's site.html (lib/site-html.ts): the `data-site-*` hooks are the
 * prototype's, and so are the steps and the copy. What changed from its
 * js/site.js is the sign-in: the Renown SDK holds the key, sends the person to
 * Renown, checks the credential it brings back and keeps the session (and the
 * session cookie the server renders the header from).
 *
 * Renders nothing; it binds once and repaints when the Renown session changes.
 */

type User = { did: string; name: string; initials: string; image?: string };

/** Set before leaving for Renown, so the return reopens the dialog; carries a
    `?env=` deep link through the round trip. */
const RETURN_FLAG = "sektar.site.signin";

function readFlag(): { env: string | null } | null {
  try {
    const value = sessionStorage.getItem(RETURN_FLAG);
    return value ? (JSON.parse(value) as { env: string | null }) : null;
  } catch {
    return null;
  }
}

function shortDid(did: string) {
  const tail = did.split(":").pop() ?? did;
  return `${tail.slice(0, 6)}…${tail.slice(-4)}`;
}

function initials(name: string) {
  const parts = name.replace(/^@/, "").split(/[\s._-]+/).filter(Boolean);
  return ((parts[0] ?? "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function userOf(auth: RenownAuthAsync): User | null {
  const did = auth.user?.did;
  if (!did) return null;
  const username = auth.user?.profile?.username;
  return {
    did,
    name: username ? `@${username}` : (auth.displayName ?? shortDid(did)),
    // As in the prototype: initials from the username, or "S" for Sektar.
    initials: username ? initials(username) : "S",
    image: auth.avatarUrl ?? auth.user?.profile?.userImage ?? undefined,
  };
}

export function SiteController() {
  const auth = useRenownAuthAsync();
  const renown = useRenown();
  const authRef = useRef(auth);
  const renownRef = useRef(renown);
  const api = useRef<{
    paint: (user: User | null) => void;
    open: () => void;
    showWhere: (user: User) => void;
    go: (user: User, env: Environment, keep: boolean) => void;
    busy: (text: string) => void;
    fail: (text: string) => void;
  } | null>(null);
  // Read on mount, before RenownProvider (a parent, whose effects run after
  // ours) consumes `?user=`.
  const returning = useRef<{ env: Environment | null } | null>(null);
  // A `?env=` link waiting for the person to sign in.
  const deepLink = useRef<string | null>(null);

  useEffect(() => {
    authRef.current = auth;
    renownRef.current = renown;
  });

  /* ---------------------------------------------------------- bind once */
  useEffect(() => {
    const dialog = document.getElementById("site-login") as HTMLDialogElement | null;
    if (!dialog) return;
    const $ = <T extends Element = HTMLElement>(selector: string) =>
      dialog.querySelector(selector) as T;
    let opener: HTMLElement | null = null;
    let kind: EnvKind = "portle";
    let pending: { user: User; env: Environment; keep: boolean } | null = null;

    const params = new URLSearchParams(location.search);
    const flag = readFlag();
    // A deep link to an environment: taken off the address bar into a ref (the
    // effect may run twice, and the second run sees a clean URL), then carried
    // through Renown in the return flag.
    if (params.has("env")) {
      deepLink.current = params.get("env");
      params.delete("env");
      history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : "") + location.hash);
    }
    if (params.has("user") || flag) {
      const link = flag?.env ?? deepLink.current;
      returning.current ??= { env: link ? envFromLink(link) : null };
      deepLink.current = null;
    }

    function step(name: string) {
      dialog!.querySelectorAll<HTMLElement>("[data-step]").forEach((el) => {
        el.hidden = el.dataset.step !== name;
      });
      const first = dialog!.querySelector<HTMLElement>(
        `[data-step="${name}"] [data-site-where-input], [data-step="${name}"] .sk-btn--primary`,
      );
      if (first && dialog!.open) setTimeout(() => first.focus(), 0);
    }
    function busy(text: string) {
      $("[data-site-busy-text]").textContent = text;
      step("busy");
    }
    function fail(text: string) {
      $("[data-site-fail-text]").textContent = text;
      step("failed");
    }

    function paint(user: User | null) {
      document.body.classList.toggle("is-signed-in", !!user);
      if (!user) return;
      document.querySelectorAll("[data-site-username]").forEach((el) => {
        el.textContent = "Open my Sektar";
      });
      document.querySelectorAll("[data-site-initials]").forEach((el) => {
        el.textContent = user.initials;
      });
      $("[data-site-name]").textContent = user.name;
      $("[data-site-did]").textContent = user.did;
      const avatar = $("[data-site-avatar]");
      avatar.textContent = "";
      if (user.image) {
        const img = document.createElement("img");
        img.src = user.image;
        img.alt = "";
        avatar.appendChild(img);
      } else {
        avatar.textContent = user.initials;
      }
    }

    function open(from?: HTMLElement | null) {
      opener = from ?? (document.activeElement as HTMLElement | null);
      const want = from?.dataset.siteWant;
      if (want === "vetra" || want === "portle") {
        kind = want;
        try {
          sessionStorage.setItem(WANT_KEY, want);
        } catch {
          // storage blocked: the choice just doesn't survive the redirect
        }
      }
      if (!dialog!.open) dialog!.showModal();
      const user = userOf(authRef.current);
      if (user) showWhere(user);
      else step("start");
    }
    function close() {
      if (dialog!.open) dialog!.close();
    }

    /* ------------------------------------------------ where it runs */
    function paintKind() {
      dialog!.querySelectorAll<HTMLElement>("[data-site-kind]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.dataset.siteKind === kind));
      });
      const cloud = kind === "vetra";
      invite.hidden = !cloud;
      const { prefix, suffix } = cloudAffixes();
      $("[data-site-where-label]").textContent = cloud ? "Environment name" : "Your address";
      $("[data-site-prefix]").textContent = cloud ? prefix : "https://app.";
      const suffixEl = $("[data-site-suffix]");
      suffixEl.hidden = !cloud || !suffix;
      suffixEl.textContent = suffix;
      $<HTMLInputElement>("[data-site-where-input]").placeholder = cloud ? "marit" : "marit.studio";
      $("[data-site-where-hint]").textContent = cloud
        ? "The name of your environment, from the email you got when it was created. Or paste the full link."
        : "The address you chose when you set up the tunnel. Or paste the full link.";
      preview();
    }
    function typed() {
      return typedEnv($<HTMLInputElement>("[data-site-where-input]").value, kind);
    }
    function preview() {
      const env = typed();
      const el = $("[data-site-preview]");
      el.textContent = "";
      if (env) {
        el.appendChild(document.createTextNode("Opens "));
        const b = document.createElement("b");
        b.textContent = env.url;
        el.appendChild(b);
      }
    }

    function envRow(user: User, env: Environment) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "site-env";
      const cloud = env.kind === "vetra";
      button.innerHTML =
        `<span class="sk-icon-tile sk-icon-tile--sm${cloud ? "" : " sk-icon-tile--forest"}"><svg class="sk-icon"><use href="#${cloud ? "i-sync" : "i-dashboard"}"/></svg></span>` +
        '<span style="min-width:0"><span class="site-env__name"></span><span class="site-env__url" style="display:block"></span></span>' +
        '<svg class="sk-icon"><use href="#i-arrow-right"/></svg>';
      button.querySelector(".site-env__name")!.textContent = `${cloud ? "Sektar cloud" : "My computer"} · ${env.name}`;
      button.querySelector(".site-env__url")!.textContent = env.url;
      button.addEventListener("click", () => go(user, env, true));
      const drop = document.createElement("button");
      drop.type = "button";
      drop.className = "sk-btn sk-btn--ghost sk-btn--icon sk-btn--sm";
      drop.setAttribute("aria-label", `Forget ${env.url}`);
      drop.innerHTML = '<svg class="sk-icon"><use href="#i-close"/></svg>';
      drop.addEventListener("click", () => {
        forget(user.did, env.url);
        showWhere(user);
      });
      li.append(button, drop);
      return li;
    }

    /** A short-lived Renown bearer for the directory; null when there is none. */
    async function directoryBearer(): Promise<string | null> {
      try {
        return (await renownRef.current?.getBearerToken({ expiresIn: 300 })) ?? null;
      } catch {
        return null;
      }
    }

    function showWhere(user: User) {
      try {
        const want = sessionStorage.getItem(WANT_KEY);
        sessionStorage.removeItem(WANT_KEY);
        if (want === "vetra" || want === "portle") kind = want;
      } catch {
        // storage blocked
      }
      paint(user);
      step("where");
      const list = $("[data-site-envs]");
      list.textContent = "";
      const envs = knownEnvs(user.did);
      $("[data-site-known]").hidden = envs.length === 0;
      $("[data-site-or]").hidden = envs.length === 0;
      for (const env of envs) list.appendChild(envRow(user, env));
      paintKind();
      void directoryBearer().then(async (bearer) => {
        const found = await fromDirectory(user.did, bearer);
        const have = envs.map((e) => e.url);
        for (const env of found) {
          if (!have.includes(env.url)) {
            list.appendChild(envRow(user, env));
            have.push(env.url);
          }
        }
        if (found.length) {
          $("[data-site-known]").hidden = false;
          $("[data-site-or]").hidden = false;
        }
      });
    }

    function navigate(env: Environment) {
      busy(`Opening ${new URL(env.url).hostname}…`);
      location.assign(env.url);
    }
    function go(user: User, env: Environment, keep: boolean) {
      pending = { user, env, keep };
      if (keep) remember(user.did, env);
      busy(`Looking for ${new URL(env.url).hostname}…`);
      void answers(env.url).then((ok) => {
        if (ok) return navigate(env);
        $("[data-site-down-host]").textContent = new URL(env.url).hostname;
        $('[data-step="down"] .sk-modal__title').textContent =
          env.kind === "vetra" ? "Your cloud isn't answering" : "Your computer isn't answering";
        step("down");
      });
    }

    /* ------------------------------------------------ a new cloud Sektar */
    function sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /** Redeems the code, then waits until the directory lists a READY cloud Sektar, and opens it. */
    async function startCloud(user: User, code: string) {
      busy("Setting up your Sektar…");
      const bearer = await directoryBearer();
      if (!bearer) return fail("Your sign-in expired. Sign in again, then use your code.");
      try {
        await redeemCloud(code, bearer);
      } catch (err) {
        return fail(`That code didn't work: ${err instanceof Error ? err.message : String(err)}`);
      }
      const deadline = Date.now() + CLOUD_WAIT_MS;
      while (Date.now() < deadline) {
        const found = (await fromDirectory(user.did, (await directoryBearer()) ?? bearer)).filter(
          (e) => e.kind === "vetra",
        );
        const ready = found.find((e) => e.status === "READY");
        if (ready) {
          remember(user.did, ready);
          return navigate(ready);
        }
        busy(
          found.length
            ? "Starting your Sektar… This takes a few minutes the first time."
            : "Setting up your Sektar…",
        );
        await sleep(CLOUD_POLL_MS);
      }
      fail("Your Sektar is still starting. Come back in a few minutes: it will be listed here.");
    }
    function onInvite(e: SubmitEvent) {
      e.preventDefault();
      const user = userOf(authRef.current);
      if (!user) return step("start");
      const field = invite.querySelector<HTMLInputElement>("input")!;
      const code = field.value.trim();
      field.closest(".sk-field")?.classList.toggle("sk-field--error", !code);
      if (!code) return field.focus();
      void startCloud(user, code);
    }

    /* ------------------------------------------------ events */
    function onDocumentClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const opening = target.closest<HTMLElement>("[data-site-open]");
      if (opening) {
        e.preventDefault();
        open(opening);
        return;
      }
      if (target.closest("[data-site-close]")) close();
    }
    function onDialogClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target === dialog) return close(); // the backdrop
      if (target.closest("[data-site-renown]")) {
        const a = authRef.current;
        busy("Taking you to Renown…");
        // The return lands back here; reopen the dialog then.
        try {
          sessionStorage.setItem(RETURN_FLAG, JSON.stringify({ env: deepLink.current }));
        } catch {
          /* private mode: the ?user= param still reopens it */
        }
        a.login();
        return;
      }
      const kindButton = target.closest<HTMLElement>("[data-site-kind]");
      if (kindButton) {
        kind = kindButton.dataset.siteKind as EnvKind;
        paintKind();
        return;
      }
      if (target.closest("[data-site-signout]")) {
        void authRef.current.logout().then(() => {
          paint(null);
          step("start");
        });
        return;
      }
      if (!pending) return;
      if (target.closest("[data-site-retry]")) go(pending.user, pending.env, pending.keep);
      else if (target.closest("[data-site-anyway]")) navigate(pending.env);
      else if (target.closest("[data-site-back]")) showWhere(pending.user);
    }
    function onSubmit(e: SubmitEvent) {
      e.preventDefault();
      const user = userOf(authRef.current);
      if (!user) return step("start");
      const env = typed();
      const input = $<HTMLInputElement>("[data-site-where-input]");
      input.closest(".sk-field")?.classList.toggle("sk-field--error", !env);
      if (!env) {
        $("[data-site-where-hint]").textContent =
          kind === "vetra"
            ? "Use letters, digits and dashes, like marit. Or paste the full link."
            : "That doesn't look like an address. Use something like marit.studio, or paste the full link.";
        input.focus();
        return;
      }
      go(user, env, $<HTMLInputElement>("[data-site-remember]").checked);
    }
    function onClose() {
      opener?.focus?.();
    }

    const form = $<HTMLFormElement>("[data-site-where]");
    const input = $<HTMLInputElement>("[data-site-where-input]");
    const invite = inviteForm(form);
    enhanceCards();
    document.addEventListener("click", onDocumentClick);
    dialog.addEventListener("click", onDialogClick);
    dialog.addEventListener("close", onClose);
    form.addEventListener("submit", onSubmit);
    invite.addEventListener("submit", onInvite);
    input.addEventListener("input", preview);

    api.current = { paint, open: () => open(), showWhere, go, busy, fail };
    if (returning.current) {
      opener = document.querySelector<HTMLElement>(".site-header__login");
      dialog.showModal();
      busy("Checking your sign-in…");
    }

    return () => {
      document.removeEventListener("click", onDocumentClick);
      dialog.removeEventListener("click", onDialogClick);
      dialog.removeEventListener("close", onClose);
      form.removeEventListener("submit", onSubmit);
      invite.removeEventListener("submit", onInvite);
      invite.remove();
      input.removeEventListener("input", preview);
      api.current = null;
    };
  }, []);

  /* ---------------------------------------------------------- session changes */
  const did = auth.user?.did;
  const { status, displayName, avatarUrl } = auth;
  useEffect(() => {
    const site = api.current;
    if (!site) return;
    const user = userOf(authRef.current);
    site.paint(user);

    // Back from Renown: wait for a definite answer. Between the provider taking
    // `?user=` off the URL and the credential check starting, the SDK briefly
    // reports no session; only "not-authorized" means the check failed.
    const back = returning.current;
    if (!back) return;
    const settle = (signedIn: User | null) => {
      returning.current = null;
      try {
        sessionStorage.removeItem(RETURN_FLAG);
      } catch {
        /* private mode */
      }
      if (signedIn) {
        if (back.env) site.go(signedIn, back.env, true);
        else site.showWhere(signedIn);
      } else {
        site.fail(
          authRef.current.error?.message ??
            "Renown didn't confirm the sign-in. Try again, and approve the site when Renown asks.",
        );
      }
    };
    if (user) return settle(user);
    if (status === "not-authorized") return settle(null);
    // A check that never answers still ends in a message the person can act on.
    const timer = setTimeout(() => {
      if (returning.current === back) settle(userOf(authRef.current));
    }, 30_000);
    return () => clearTimeout(timer);
  }, [did, status, displayName, avatarUrl]);

  /* Until Renown has initialized, login() would fall back to the default portal
     with no identity for this site: keep the Renown buttons disabled. */
  const ready = renown !== undefined;
  useEffect(() => {
    document.querySelectorAll<HTMLButtonElement>("[data-site-renown]").forEach((button) => {
      button.disabled = !ready;
    });
  }, [ready]);

  return null;
}

/**
 * "Have an invite code?": shown on Sektar cloud, above the address form. The
 * page's markup is the design system's, verbatim, so the site adds it here.
 */
function inviteForm(where: HTMLFormElement): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "site-where";
  form.noValidate = true;
  form.hidden = true;
  form.innerHTML = `
    <div class="sk-field">
      <label class="sk-label" for="site-invite-input">Invite code</label>
      <input id="site-invite-input" class="sk-input" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="sektar-…">
      <p class="sk-hint">New here? Your code gives you your own Sektar in the cloud, set up in a few minutes.</p>
    </div>
    <div class="sk-modal__footer sk-mt-4"><button class="sk-btn sk-btn--primary" type="submit">Start my cloud Sektar</button></div>
    <p class="site-divider">or open one you have</p>`;
  where.parentElement?.insertBefore(form, where);
  return form;
}

/**
 * The three "Get started" cards, wired: Free opens Sektar in the browser,
 * "On your own computer" offers the download (and Log in to reach it through
 * its tunnel), "In the cloud" opens the dialog on Sektar cloud.
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
  const localButton = local?.querySelector<HTMLElement>("[data-site-open]");
  if (localButton && !local.querySelector("[data-site-download]")) {
    const a = document.createElement("a");
    a.className = "sk-btn sk-btn--primary";
    a.href = DOWNLOAD_URL;
    a.target = "_blank";
    a.rel = "noopener";
    a.dataset.siteDownload = "";
    a.textContent = "Download";
    localButton.before(a);
    localButton.className = "sk-btn sk-btn--secondary";
    localButton.dataset.siteWant = "portle";
  }
  const cloudButton = cloud?.querySelector<HTMLElement>("[data-site-open]");
  if (cloudButton) {
    cloudButton.dataset.siteWant = "vetra";
    cloudButton.textContent = "Get it in the cloud";
  }
}

