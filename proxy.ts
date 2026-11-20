import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/login", "/signup"];

// Optimistic redirects based on the presence of a session cookie only.
// Real authorization happens in tRPC procedures and route handlers.
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;

  if (AUTH_PAGES.includes(pathname)) {
    return hasSession ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/resume/:path*", "/cover-letters/:path*", "/login", "/signup"],
};
