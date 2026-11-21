import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConsentForm } from "@/components/auth/consent-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Allow access" };

function toSearchParams(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  return query;
}

/** Only plain https links to the app's own site are shown; everything else the client says about itself is text. */
function safeHttpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function InvalidRequest() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-4xl">Link expired</h1>
      <p className="text-sm text-muted-foreground">
        This connection request is no longer valid. Go back to the app you were connecting and try again.
      </p>
    </div>
  );
}

export default function ConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  return (
    <Suspense>
      <Consent searchParams={searchParams} />
    </Suspense>
  );
}

async function Consent({ searchParams }: { searchParams: PageProps<"/oauth/consent">["searchParams"] }) {
  const query = toSearchParams(await searchParams);
  const clientId = query.get("client_id");
  const { secret } = await auth.$context;
  if (!clientId || !(await verifyOAuthQueryParams(query.toString(), secret))) return <InvalidRequest />;

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect(`/login?${query.toString()}`);

  const client = await auth.api
    .getOAuthClientPublic({ query: { client_id: clientId }, headers: requestHeaders })
    .catch(() => null);
  if (!client) return <InvalidRequest />;

  const name = typeof client.client_name === "string" && client.client_name.trim() ? client.client_name.trim() : null;
  return <ConsentForm clientName={name} clientSite={safeHttpsUrl(client.client_uri)} email={session.user.email} />;
}
