"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, PlugIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/time";
import { useTRPC } from "@/lib/trpc/client";

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} aria-label={label} className="h-10 bg-card font-mono text-sm" onFocus={(e) => e.target.select()} />
      <Button
        variant="outline"
        className="h-10"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function ConnectInstructions() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.connections.list.queryOptions());
  if (!data) return <Skeleton className="h-40 rounded-xl" />;
  const command = `claude mcp add --transport http swe-resume ${data.mcpUrl}`;
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-sm">
      <div className="flex flex-col gap-2">
        <p className="font-medium">Server URL</p>
        <CopyField value={data.mcpUrl} label="MCP server URL" />
      </div>
      <ul className="flex flex-col gap-2 text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">Claude:</span> Settings → Connectors → Add custom connector, then
          paste the URL.
        </li>
        <li>
          <span className="font-medium text-foreground">ChatGPT:</span> turn on developer mode in Settings, then create an
          app with this URL.
        </li>
        <li className="flex flex-col gap-2">
          <span>
            <span className="font-medium text-foreground">Claude Code:</span> run
          </span>
          <CopyField value={command} label="Claude Code command" />
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        The app opens a SWE Resume page where you sign in and choose Allow.
      </p>
    </div>
  );
}

export function ConnectedApps() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery(trpc.connections.list.queryOptions());
  const [pending, setPending] = useState<{ clientId: string; name: string } | null>(null);
  const revoke = useMutation(
    trpc.connections.revoke.mutationOptions({
      onSuccess: () => {
        toast(`${pending?.name ?? "The app"} was disconnected.`);
        setPending(null);
        void queryClient.invalidateQueries({ queryKey: trpc.connections.list.queryKey() });
      },
      onError: () => toast.error("Couldn't disconnect the app. Try again."),
    }),
  );

  if (isPending) return <Skeleton className="h-20 rounded-xl" />;
  if (isError) return <p className="text-sm text-destructive">Couldn&apos;t load connected apps.</p>;
  if (data.apps.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <PlugIcon className="size-4 shrink-0" aria-hidden />
        No apps connected yet.
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col divide-y rounded-xl border bg-card">
        {data.apps.map((app) => {
          const name = app.name?.trim() || "Unnamed app";
          return (
            <li key={app.clientId} className="flex items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <PlugIcon className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {name}
                  {app.host && <span className="font-normal text-muted-foreground"> · {app.host}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected {timeAgo(app.connectedAt)}
                  {app.lastActiveAt && ` · last active ${timeAgo(app.lastActiveAt)}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPending({ clientId: app.clientId, name })}>
                Disconnect
              </Button>
            </li>
          );
        })}
      </ul>
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {pending?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It loses access to your resume and cover letters right away. You can connect it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white shadow-none hover:bg-destructive/90"
              disabled={revoke.isPending}
              onClick={() => pending && revoke.mutate({ clientId: pending.clientId })}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
