"use client";

import { LogOutIcon, MailWarningIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient, signOut, useSession } from "@/lib/auth-client";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo href="/dashboard" />
        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const { data, isPending } = useSession();
  const router = useRouter();
  if (isPending) return <Skeleton className="size-9 rounded-full" />;
  if (!data) return null;
  const { user } = data;
  const initials = (user.name || user.email)
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold transition-transform hover:scale-105"
          />
        }
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
            <span className="truncate text-xs font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VerifyEmailBanner() {
  const { data } = useSession();
  const [sent, setSent] = useState(false);
  if (!data || data.user.emailVerified) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm sm:px-6">
        <MailWarningIcon className="size-4 shrink-0" />
        <span className="flex-1">
          Confirm <strong className="font-semibold">{data.user.email}</strong> so you can recover your account.
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={sent}
          onClick={async () => {
            const { error } = await authClient.sendVerificationEmail({
              email: data.user.email,
              callbackURL: "/dashboard",
            });
            if (error) toast.error(error.message ?? "Couldn't send the email.");
            else {
              setSent(true);
              toast.success("Verification email sent.");
            }
          }}
        >
          {sent ? "Email sent" : "Resend email"}
        </Button>
      </div>
    </div>
  );
}
