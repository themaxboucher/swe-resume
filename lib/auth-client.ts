import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

// oauthProviderClient sends the signed OAuth query along with sign-in and sign-up, so an MCP client's
// authorization picks up where it left off once the user is signed in.
export const authClient = createAuthClient({ plugins: [oauthProviderClient()] });

export const { useSession, signIn, signUp, signOut } = authClient;
