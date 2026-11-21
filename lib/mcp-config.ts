/** The OAuth scope that lets an MCP client read and edit the user's resume and cover letters. */
export const MCP_SCOPE = "resume";

export function appUrl() {
  return (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** The MCP endpoint, which is also the OAuth resource its access tokens are bound to. */
export function mcpResourceUrl() {
  return `${appUrl()}/api/mcp`;
}
