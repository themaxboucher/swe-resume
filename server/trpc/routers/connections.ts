import { and, desc, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";
import { oauthAccessToken, oauthClient, oauthConsent, oauthRefreshToken } from "@/lib/db/schema";
import { mcpResourceUrl } from "@/lib/mcp-config";
import { createTRPCRouter, protectedProcedure } from "../init";

/** AI apps (Claude, ChatGPT…) the user let into their account through MCP. */
export const connectionsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const lastActive = ctx.db
      .select({ clientId: oauthRefreshToken.clientId, at: max(oauthRefreshToken.createdAt).as("at") })
      .from(oauthRefreshToken)
      .where(eq(oauthRefreshToken.userId, ctx.user.id))
      .groupBy(oauthRefreshToken.clientId)
      .as("last_active");
    const rows = await ctx.db
      .select({
        clientId: oauthConsent.clientId,
        name: oauthClient.name,
        uri: oauthClient.uri,
        connectedAt: oauthConsent.createdAt,
        lastActiveAt: lastActive.at,
      })
      .from(oauthConsent)
      .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
      .leftJoin(lastActive, eq(lastActive.clientId, oauthConsent.clientId))
      .where(eq(oauthConsent.userId, ctx.user.id))
      .orderBy(desc(oauthConsent.createdAt));
    return {
      mcpUrl: mcpResourceUrl(),
      apps: rows.map((row) => ({
        ...row,
        // What a client says about itself is untrusted: show its site's host only, and only for https.
        host: safeHost(row.uri),
        uri: undefined,
      })),
    };
  }),

  /** Disconnects an app: it can't call the MCP server again until the user approves it anew. */
  revoke: protectedProcedure.input(z.object({ clientId: z.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
    const mine = (table: typeof oauthConsent | typeof oauthRefreshToken | typeof oauthAccessToken) =>
      and(eq(table.userId, ctx.user.id), eq(table.clientId, input.clientId));
    const now = new Date();
    await ctx.db.transaction(async (tx) => {
      await tx.delete(oauthConsent).where(mine(oauthConsent));
      await tx.update(oauthRefreshToken).set({ revoked: now }).where(and(mine(oauthRefreshToken), isNull(oauthRefreshToken.revoked)));
      await tx.update(oauthAccessToken).set({ revoked: now }).where(and(mine(oauthAccessToken), isNull(oauthAccessToken.revoked)));
    });
    return { clientId: input.clientId };
  }),
});

function safeHost(uri: string | null) {
  if (!uri) return null;
  try {
    const url = new URL(uri);
    return url.protocol === "https:" ? url.host : null;
  } catch {
    return null;
  }
}
