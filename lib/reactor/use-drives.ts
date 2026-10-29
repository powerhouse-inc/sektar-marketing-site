"use client";

import { useSwitchboardClient } from "@powerhousedao/reactor-browser/graphql-client";
import { useEffect, useState } from "react";
import { useDocumentChanges } from "./use-document-changes";

export const DRIVE_DOCUMENT_TYPE = "powerhouse/document-drive";

export type DriveSummary = { id: string; name: string; slug: string | null };

/* A one-off document against the reactor's own `/graphql` endpoint. The light
   client's `request` sends it with the same transport and bearer token as
   every other call. */
const FIND_DRIVES = /* GraphQL */ `
  query FindDrives($type: String!) {
    findDocuments(search: { type: $type }) {
      items {
        id
        name
        slug
      }
    }
  }
`;

type FindDrivesResult = { findDocuments: { items: DriveSummary[] } };

type DrivesState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; drives: DriveSummary[] };

/** The drives the signed-in user can read, kept fresh by realtime events. */
export function useDrives(): DrivesState {
  const client = useSwitchboardClient();
  const [state, setState] = useState<DrivesState>({ status: "loading" });
  // Bumped by a change event; each bump reads the list again.
  const [revision, setRevision] = useState(0);

  useDocumentChanges([DRIVE_DOCUMENT_TYPE], () => setRevision((r) => r + 1));

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    client
      .request<FindDrivesResult>(FIND_DRIVES, { type: DRIVE_DOCUMENT_TYPE })
      .then(
        ({ findDocuments }) => {
          if (!cancelled) {
            setState({ status: "success", drives: findDocuments.items });
          }
        },
        (error: unknown) => {
          if (!cancelled) {
            setState({
              status: "error",
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        },
      );
    return () => {
      cancelled = true;
    };
  }, [client, revision]);

  return state;
}
