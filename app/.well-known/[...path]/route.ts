import { auth } from "@/lib/auth";

// OAuth discovery for MCP clients. Better Auth answers these paths itself, but they sit outside /api/auth:
//   /.well-known/oauth-protected-resource[/api/mcp]   which authorization server protects /api/mcp (RFC 9728)
//   /.well-known/oauth-authorization-server/api/auth  that server's endpoints (RFC 8414)
// Anything else falls through to Better Auth's 404.
const handler = (request: Request) => auth.handler(request);

export { handler as GET, handler as HEAD };
