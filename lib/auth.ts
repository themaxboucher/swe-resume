import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/lib/db";
import { sendEmail } from "@/lib/email";

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
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
