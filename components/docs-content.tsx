import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";

/* What Markdown renders to in the documentation, on the design system's classes
   (mdx-components.tsx hands these to every page in docs/). */

type WithChildren = { children?: ReactNode };

function elementsOf(node: ReactNode) {
  return Children.toArray(node).filter((child): child is ReactElement<WithChildren> =>
    isValidElement(child),
  );
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return Children.toArray(node)
    .map((child) => (isValidElement<WithChildren>(child) ? textOf(child.props.children) : String(child)))
    .join("");
}

/** A section heading, with the id its links need. */
export function SectionHeading({ children, ...props }: ComponentProps<"h2">) {
  const id = textOf(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <h2 id={id} {...props}>
      {children}
    </h2>
  );
}

/**
 * A Markdown table on the design system's table. Each row's first cell is its
 * heading, and every cell carries its column's name for the stacked phone layout.
 */
export function DocsTable({ children }: WithChildren) {
  const [head, body] = elementsOf(children);
  const headerRow = elementsOf(head?.props.children)[0];
  // A column's name is its heading's own text, without the link beside it.
  const columns = elementsOf(headerRow?.props.children).map((cell) =>
    Children.toArray(cell.props.children)
      .filter((child) => typeof child === "string")
      .join("")
      .trim(),
  );
  return (
    <div className="sk-table-wrap site-docs__table">
      <table className="sk-table">
        {head}
        <tbody>
          {elementsOf(body?.props.children).map((row, r) => (
            <tr key={r}>
              {elementsOf(row.props.children).map((cell, c) =>
                c === 0 ? (
                  <th key={c} scope="row">
                    {cell.props.children}
                  </th>
                ) : (
                  cloneElement(cell as ReactElement<ComponentProps<"td"> & { "data-label"?: string }>, {
                    key: c,
                    "data-label": columns[c],
                  })
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Marks something we mean to do that isn't there yet (docs/README.md). */
export function Planned() {
  return <span className="sk-badge sk-badge--mint site-docs__planned">Planned</span>;
}

/** A section still to be written; its children say what it will cover. */
export function Placeholder({ children }: WithChildren) {
  return (
    <div className="sk-alert">
      <svg className="sk-icon" aria-hidden="true">
        <use href="#i-info" />
      </svg>
      <div>
        <div className="sk-alert__title">To be written</div>
        {children}
      </div>
    </div>
  );
}
