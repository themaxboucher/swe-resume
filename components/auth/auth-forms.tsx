"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, signUp } from "@/lib/auth-client";
import { SocialButtons, type SocialProviders } from "./social-buttons";

function useNextPath() {
  const next = useSearchParams().get("next");
  // Only allow same-origin relative paths.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function Heading({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-2">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function FormField({
  label,
  children,
  aside,
}: {
  label: string;
  children: (id: string) => ReactNode;
  aside?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {aside}
      </div>
      {children(id)}
    </div>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/8 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  );
}

function useSubmit(action: () => Promise<string | null | void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const message = await action();
      if (message) setError(message);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };
  return { pending, error, onSubmit };
}

export function LoginForm({ providers }: { providers: SocialProviders }) {
  const router = useRouter();
  const next = useNextPath();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pending, error, onSubmit } = useSubmit(async () => {
    const { error } = await signIn.email({ email, password });
    if (error) return error.message ?? "Invalid email or password.";
    router.push(next);
    router.refresh();
  });

  return (
    <>
          <Heading
            title="Welcome back"
            subtitle={
          <>
                New here?{" "}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                  Create an account
                </Link>
          </>
        }
      />
      <div className="flex flex-col gap-5">
        <SocialButtons providers={providers} callbackURL={next} />
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Email">
            {(id) => (
              <>
                <Input
                  id={id}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-card"
                />
              </>
            )}
          </FormField>
          <FormField
            label="Password"
            aside={
              <Link href="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                Forgot password?
              </Link>
            }
          >
            {(id) => (
              <>
                <Input
                  id={id}
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-card"
                />
              </>
            )}
          </FormField>
          <ErrorText error={error} />
          <Button type="submit" size="lg" disabled={pending} className="mt-1">
            {pending && <Loader2Icon className="animate-spin" />} Sign in
          </Button>
        </form>
      </div>
    </>
  );
}

export function SignupForm({ providers }: { providers: SocialProviders }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pending, error, onSubmit } = useSubmit(async () => {
    const { error } = await signUp.email({ name, email, password, callbackURL: "/dashboard" });
    if (error) return error.message ?? "Couldn't create your account.";
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <>
          <Heading
            title="Create your account"
            subtitle={
          <>
                Already have one?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
          </>
        }
      />
      <div className="flex flex-col gap-5">
        <SocialButtons providers={providers} callbackURL="/dashboard" />
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Full name">
            {(id) => (
              <>
                <Input
                  id={id}
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 bg-card"
                />
              </>
            )}
          </FormField>
          <FormField label="Email">
            {(id) => (
              <>
                <Input
                  id={id}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-card"
                />
              </>
            )}
          </FormField>
          <FormField label="Password">
            {(id) => (
              <>
                <Input
                  id={id}
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-card"
                />
                <span className="text-xs text-muted-foreground">At least 8 characters.</span>
              </>
            )}
          </FormField>
          <ErrorText error={error} />
          <Button type="submit" size="lg" disabled={pending} className="mt-1">
            {pending && <Loader2Icon className="animate-spin" />} Create account
          </Button>
        </form>
      </div>
    </>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { pending, error, onSubmit } = useSubmit(async () => {
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    if (error) return error.message ?? "Couldn't send the reset email.";
    setSent(true);
  });

  if (sent) {
    return (
      <Heading
        title="Check your inbox"
        subtitle={
          <>
                If an account exists for <strong className="text-foreground">{email}</strong>, a reset link is on its way.{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Back to sign in
                </Link>
          </>
        }
      />
    );
  }

  return (
    <>
          <Heading title="Reset your password" subtitle="We'll email you a link to choose a new one." />
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField label="Email">
                {(id) => (
              <>
              <Input
                  id={id}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-card"
              />
              </>
            )}
          </FormField>
        <ErrorText error={error} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />} Send reset link
        </Button>
        <Link href="/login" className="text-center text-sm font-medium text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </form>
    </>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const { pending, error, onSubmit } = useSubmit(async () => {
    if (!token) return "This reset link is invalid or has expired.";
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) return error.message ?? "This reset link is invalid or has expired.";
    router.push("/login");
  });

  if (!token || params.get("error")) {
    return (
      <Heading
        title="Link expired"
        subtitle={
          <>
                This reset link is invalid or has expired.{" "}
                <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
                  Request a new one
                </Link>
          </>
        }
      />
    );
  }

  return (
    <>
          <Heading title="Choose a new password" subtitle="You'll use it to sign in from now on." />
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField label="New password">
                {(id) => (
              <>
              <Input
                  id={id}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-card"
              />
              </>
            )}
          </FormField>
        <ErrorText error={error} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />} Update password
        </Button>
      </form>
    </>
  );
}
