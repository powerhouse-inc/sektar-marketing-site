"use client";

import Link from "next/link";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { useDrives } from "@/lib/reactor/use-drives";

function DriveList() {
  const drives = useDrives();

  return (
    <>
      {drives.status === "loading" ? (
        <p className="text-muted-foreground">Loading drives…</p>
      ) : drives.status === "error" ? (
        <p role="alert" className="text-destructive">
          Could not load drives: {drives.error.message}
        </p>
      ) : drives.drives.length === 0 ? (
        <p className="text-muted-foreground">No drives on this switchboard yet.</p>
      ) : (
        <div className="flex w-full flex-wrap gap-4">
          {drives.drives.map((drive) => (
            <Card
              key={drive.id}
              className="w-full max-w-xs px-3 py-3"
              data-testid="drive-card"
            >
              <CardTitle>💽 {drive.name}</CardTitle>
              <CardDescription>
                ID: <code>{drive.id}</code>
              </CardDescription>
              <CardAction className="w-full">
                <Button asChild className="w-full">
                  <Link href={`/drives/${encodeURIComponent(drive.id)}`}>
                    View drive
                  </Link>
                </Button>
              </CardAction>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <main>
      <h1 className="my-6 text-3xl">Drives</h1>
      <ClientOnly
        fallback={<p className="text-muted-foreground">Loading drives…</p>}
      >
        <DriveList />
      </ClientOnly>
    </main>
  );
}
