# Sektar's documentation

The `.mdx` files here are the pages at <https://sektar.io/docs>. They are also
the spec for Sektar: the product (`powerhouse-inc/sektar`) and this site.

## The practice

What these pages say is what Sektar is meant to do for the person using it. If
someone using Sektar would notice a change, the change is described here.

Work in phases, as in test-driven development:

1. **Write what it should be.** Describe the behaviour on the page as it should
   work, and mark it `<Planned />`. Record the difference in [GAPS.md](GAPS.md).
   The page is now a failing test: it says something the product doesn't do yet.
2. **Rewire the implementation.** Change the code until the page is true. A pull
   request in `sektar` names the page it follows.
3. **Turn it green.** Check the behaviour, then remove the `<Planned />` and the
   GAPS.md row in the change that ships it.

Some rules hold through all three:

- **Never publish an unmarked promise.** Unmarked text describes Sektar as it is
  today.
- **A difference is a bug.** When a page and the product disagree, don't quietly
  edit whichever side you aren't working on. Decide which one is right, and
  record the difference in GAPS.md until it is fixed.
- **Write for the person using it.** Follow the voice in the design system's
  README: "you", plain words, no hype. The page says what happens, not how it is
  built. Design notes and plans stay in `sektar/docs`.
- **Check before you claim.** Check a page against the code, and say what you
  checked in the comment at its top. "Read from the code" and "ran it" are
  different claims.

`design-system/delivery.html` in `sektar-design-elements` is out of date. It is
useful background, not a source for these pages.

## Adding a page

1. Add `docs/<slug>.mdx`, with a `# Title` first.
2. List it in `lib/docs.ts`. That list drives the navigation, the sitemap and the
   metadata. Set `preliminary: true` while it is unfinished.

In a page you can use `<Planned />` and `<Placeholder>`. Markdown tables become
the design system's table, stacked on a phone, and each `##` heading gets a link
target. Their styling is in the design system's `site.css`.
