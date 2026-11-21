"use client";

import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const CAN = [
  "Read your resume, its versions and your cover letters",
  "Edit their text and design, and create new versions and cover letters",
  "Show, hide and reorder sections, entries and contacts in a version",
];
const CANNOT = ["Delete anything", "See your password or change your account"];

export function ConsentForm({
  clientName,
  clientSite,
  email,
}: {
  clientName: string | null;
  clientSite: string | null;
  email: string;
}) {
  const [pending, setPending] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const app = clientName ?? "This app";

  // The auth client adds the signed request from this page's URL and follows the redirect back to the app.
  const answer = async (accept: boolean) => {
    setPending(accept ? "allow" : "deny");
    setError(null);
    const { error } = await authClient.oauth2.consent({ accept });
    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">Connect {app}?</h1>
        <p className="text-sm text-muted-foreground">
          {app}
          {clientSite && <span> ({new URL(clientSite).host})</span>} wants to access your SWE Resume account{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-sm">
        <div className="flex flex-col gap-2">
          <p className="font-medium">It will be able to</p>
          <ul className="flex flex-col gap-1.5">
            {CAN.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium">It won&apos;t be able to</p>
          <ul className="flex flex-col gap-1.5 text-muted-foreground">
            {CANNOT.map((item) => (
              <li key={item} className="flex gap-2">
                <XIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button size="lg" disabled={pending !== null} onClick={() => answer(true)}>
          {pending === "allow" && <Loader2Icon className="animate-spin" />} Allow
        </Button>
        <Button size="lg" variant="outline" disabled={pending !== null} onClick={() => answer(false)}>
          {pending === "deny" && <Loader2Icon className="animate-spin" />} Deny
        </Button>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          You can disconnect it any time in Settings → Connected apps.
        </p>
      </div>
    </div>
  );
}
