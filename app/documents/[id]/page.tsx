"use client";

import {
  useDispatch,
  useDocumentSafe,
} from "@powerhousedao/reactor-browser/graphql-client";
import { setName } from "document-model";
import { use, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

function DocumentView({ id }: { id: string }) {
  const document = useDocumentSafe(decodeURIComponent(id));
  // Dispatch writes to the switchboard first (no optimistic state): signed by
  // the Renown user when one is signed in, and the returned document replaces
  // the cached one. Another tab sees the change through realtime events.
  const [, dispatch] = useDispatch(document.data);
  const [name, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);

  if (document.status === "initial" || document.status === "pending") {
    return <p className="text-muted-foreground">Loading document…</p>;
  }
  if (document.status === "error") {
    return (
      <p role="alert" className="text-destructive">
        Could not load this document.
      </p>
    );
  }

  const { header } = document.data;
  // The base document type has no model state; every model keeps its own in `global`.
  const global = (document.data.state as { global?: unknown }).global;

  function rename(event: FormEvent) {
    event.preventDefault();
    const next = name.trim();
    if (!next) return;
    setSaving(true);
    // SET_NAME is a base action every document model accepts, so this works
    // for any document type without registering its model. Model-specific
    // actions come from the model's own action creators.
    dispatch(
      setName(next),
      (errors) => {
        setSaving(false);
        toast.error(`Rename failed: ${errors[0]?.message ?? "unknown error"}`);
      },
      () => {
        setSaving(false);
        setNameDraft("");
        toast.success("Renamed");
      },
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="mt-6 text-2xl" data-testid="document-name">
        {header.name}
      </h1>
      <Table className="max-w-xl">
        <TableBody>
          <TableRow>
            <TableCell className="font-semibold">ID</TableCell>
            <TableCell>
              <code>{header.id}</code>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-semibold">Type</TableCell>
            <TableCell>{header.documentType}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-semibold">Last modified</TableCell>
            <TableCell>{header.lastModifiedAtUtcIso}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <form onSubmit={rename} className="flex max-w-xl gap-2">
        <input
          aria-label="New name"
          value={name}
          onChange={(event) => setNameDraft(event.target.value)}
          placeholder="New name"
          className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm"
        />
        <Button type="submit" disabled={saving || !name.trim()}>
          Rename
        </Button>
      </form>

      <section>
        <h2 className="mb-2 text-lg">Global state</h2>
        <pre className="max-w-full overflow-auto rounded-md border p-3 text-xs">
          {JSON.stringify(global, null, 2)}
        </pre>
      </section>
    </main>
  );
}

/* Reads documents through the light client, which exists in the browser only. */
export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ClientOnly fallback={<p className="text-muted-foreground">Loading document…</p>}>
      <DocumentView id={id} />
    </ClientOnly>
  );
}
