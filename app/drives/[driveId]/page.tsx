"use client";

import { useDocumentSafe } from "@powerhousedao/reactor-browser/graphql-client";
import Link from "next/link";
import { use } from "react";
import { ClientOnly } from "@/components/client-only";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* The `powerhouse/document-drive` model keeps its folder tree in global state. */
type DriveNode = {
  id: string;
  name: string;
  kind: "file" | "folder" | string;
  documentType?: string;
  parentFolder: string | null;
};

type DriveGlobalState = { name: string; nodes: DriveNode[] };

function DriveView({ driveId }: { driveId: string }) {
  // Non-suspending read; it stays in sync with realtime changes to the drive.
  const drive = useDocumentSafe(decodeURIComponent(driveId));

  if (drive.status === "initial" || drive.status === "pending") {
    return <p className="text-muted-foreground">Loading drive…</p>;
  }
  if (drive.status === "error") {
    return (
      <p role="alert" className="text-destructive">
        Could not load this drive.
      </p>
    );
  }

  // The base document type has no model state; drives keep theirs in `global`.
  const global = (drive.data.state as { global?: Partial<DriveGlobalState> })
    .global;
  const nodes = global?.nodes ?? [];

  return (
    <main>
      <h1 className="my-6 text-2xl">
        💽 <span data-testid="drive-name">{drive.data.header.name}</span>
      </h1>
      <p className="mb-4 text-sm">
        <Link
          className="underline"
          href={`/documents/${encodeURIComponent(drive.data.header.id)}`}
        >
          Open the drive document
        </Link>
      </p>
      <Table className="w-min">
        <TableCaption>
          {nodes.length === 0 ? "This drive is empty." : `${nodes.length} nodes`}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead colSpan={2}>Name</TableHead>
            <TableHead>Document type</TableHead>
            <TableHead>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nodes.map((node) =>
            node.kind === "folder" ? (
              <TableRow key={node.id}>
                <TableCell>📁</TableCell>
                <TableCell>{node.name}</TableCell>
                <TableCell />
                <TableCell>{node.id}</TableCell>
              </TableRow>
            ) : (
              <TableRow key={node.id}>
                <TableCell>📄</TableCell>
                <TableCell>
                  <Link
                    className="underline"
                    href={`/documents/${encodeURIComponent(node.id)}`}
                  >
                    {node.name}
                  </Link>
                </TableCell>
                <TableCell>{node.documentType}</TableCell>
                <TableCell>{node.id}</TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </main>
  );
}

/* Reads documents through the light client, which exists in the browser only. */
export default function DrivePage({
  params,
}: {
  params: Promise<{ driveId: string }>;
}) {
  const { driveId } = use(params);
  return (
    <ClientOnly fallback={<p className="text-muted-foreground">Loading drive…</p>}>
      <DriveView driveId={driveId} />
    </ClientOnly>
  );
}
