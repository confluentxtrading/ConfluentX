import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection at the edge.
 *
 * We only check for the presence of the session cookie here (fast, no DB, no
 * crypto). Real session verification happens server-side in the dashboard
 * layout and in every API handler via `auth()` — this middleware just gives
 * users an instant redirect instead of a flash of protected UI.
 */

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/two-factor",
];

function hasSessionCookie(req: NextRequest): boolean {
  return (
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoggedIn = hasSessionCookie(req);

  // Protect the app.
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Keep signed-in users out of auth pages.
  if (isLoggedIn && AUTH_PAGES.some((p) => pathname === p)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/two-factor",
  ],
};
