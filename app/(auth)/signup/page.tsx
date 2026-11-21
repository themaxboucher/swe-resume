import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/auth-forms";
import { enabledSocialProviders } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm providers={enabledSocialProviders} />
    </Suspense>
  );
}
