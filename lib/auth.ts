import "server-only";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { db, schema } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { MCP_SCOPE, mcpResourceUrl } from "@/lib/mcp-config";

export const enabledSocialProviders = {
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
};

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Verification is encouraged with a banner, not required to sign in.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        heading: "Reset your password",
        body: "Someone (hopefully you) asked to reset the password for your account. This link expires in one hour.",
        cta: "Choose a new password",
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        heading: "Confirm your email",
        body: "Thanks for signing up. Confirm your email address so you can recover your account later.",
        cta: "Verify email",
        url,
      });
    },
  },
  socialProviders: {
    ...(enabledSocialProviders.google && {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    }),
    ...(enabledSocialProviders.github && {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    }),
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google", "github"] },
  },
  // The OAuth provider issues tokens from /oauth2/token; the JWT plugin's own /token would hand out
  // session-derived JWTs that look like access tokens.
  disabledPaths: ["/token"],
  plugins: [
    jwt({ disableSettingJwtHeader: true }),
    // Lets Claude, ChatGPT and other MCP clients connect to /api/mcp on the user's behalf.
    mcp({
      loginPage: "/login",
      consentPage: "/oauth/consent",
      resource: mcpResourceUrl(),
      scopes: ["openid", "profile", "email", "offline_access", MCP_SCOPE],
      // Clients from before Client ID Metadata Documents register themselves (RFC 7591); the consent
      // screen is what protects the account.
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultScopes: [MCP_SCOPE, "offline_access"],
      // Desktop clients (Claude Code, Claude Desktop, Cursor) register http://localhost callbacks without
      // saying they're native apps; treat those as native instead of rejecting them.
      clientRegistrationDefaultApplicationType: "infer",
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
