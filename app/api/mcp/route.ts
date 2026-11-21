import { requireMcpAuth } from "@better-auth/mcp";
import { and, eq } from "drizzle-orm";
import { createMcpHandler } from "mcp-handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { oauthConsent, user } from "@/lib/db/schema";
import { MCP_SCOPE, mcpResourceUrl } from "@/lib/mcp-config";
import type { ResumeUser } from "@/server/documents/resume-store";
import { registerTools, SERVER_INSTRUCTIONS } from "@/server/mcp/tools";

export const maxDuration = 60;

type AuthContext = { http?: { authInfo?: { extra?: Record<string, unknown> } } };

const mcpHandler = createMcpHandler(
  (server) =>
    registerTools(server, (ctx) => {
      const account = (ctx as AuthContext).http?.authInfo?.extra?.user as ResumeUser | undefined;
      if (!account) throw new Error("MCP request without a verified user");
      return account;
    }),
  {
    serverInfo: { name: "swe-resume", version: "1.0.0" },
    instructions: SERVER_INSTRUCTIONS,
  },
);

function revoked() {
  const metadata = `${new URL(mcpResourceUrl()).origin}/.well-known/oauth-protected-resource${new URL(mcpResourceUrl()).pathname}`;
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message: "Access to SWE Resume was revoked. Connect again." }, id: null },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer error="invalid_token", error_description="Access was revoked", resource_metadata="${metadata}"`,
        "Cache-Control": "no-store",
      },
    },
  );
}

// requireMcpAuth checks the access token (signature, issuer, audience = this endpoint, expiry, scope) and
// answers unauthenticated requests with the challenge MCP clients use to start OAuth.
const handler = requireMcpAuth(
  auth,
  async (request, claims) => {
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    const clientId = typeof claims.azp === "string" ? claims.azp : null;
    if (!userId || !clientId) return revoked();

    // Tokens are self-contained, so check the user still allows this app ("Connected apps" → Revoke).
    const [allowed] = await db
      .select({ id: oauthConsent.id })
      .from(oauthConsent)
      .where(and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId)))
      .limit(1);
    if (!allowed) return revoked();
    const [account] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId));
    if (!account) return revoked();

    request.auth = {
      token: request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "",
      clientId,
      scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
      expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
      extra: { user: account },
    };
    return mcpHandler(request);
  },
  { resource: mcpResourceUrl(), requiredScopes: [MCP_SCOPE], challengeScopes: [MCP_SCOPE, "offline_access"] },
);

export { handler as DELETE, handler as GET, handler as POST };
