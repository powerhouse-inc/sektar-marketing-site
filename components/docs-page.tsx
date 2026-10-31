import Link from "next/link";
import type { ReactNode } from "react";
import { DOCS, docBySlug } from "@/lib/docs";

/** A documentation page: the section's navigation beside the page itself. */
export function DocsPage({ slug, children }: { slug?: string; children: ReactNode }) {
  const doc = slug ? docBySlug(slug) : undefined;
  return (
    <div className="sk-container site-docs">
      <nav className="site-docs__nav" aria-label="Documentation">
        <p className="sk-eyebrow">Documentation</p>
        <ul className="sk-nav">
          <li>
            <Link className="sk-nav__item" href="/docs" aria-current={slug ? undefined : "page"}>
              Overview
            </Link>
          </li>
          {DOCS.map((page) => (
            <li key={page.slug}>
              <Link
                className="sk-nav__item"
                href={`/docs/${page.slug}`}
                aria-current={page.slug === slug ? "page" : undefined}
              >
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main id="top" className="site-docs__main">
        {doc?.preliminary && (
          <div className="sk-alert sk-alert--warning site-docs__notice">
            <svg className="sk-icon" aria-hidden="true">
              <use href="#i-info" />
            </svg>
            <div>
              <div className="sk-alert__title">Preliminary</div>
              This page is still being written, and some of it may change.
            </div>
          </div>
        )}
        <article className="site-docs__article">{children}</article>
      </main>
    </div>
  );
}
