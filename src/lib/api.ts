import { NextResponse } from "next/server";

import { auth } from "@/auth";

/** Standard JSON error response. */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Standard JSON success response. */
export function apiSuccess<T extends object>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * CSRF guard for state-changing custom API routes: the request Origin must
 * match the Host. Session cookies are SameSite=Lax, so this is defense in
 * depth on top of the browser's own protections.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (no Origin header)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Resolve the authenticated session or null. Use in every protected handler:
 *
 *   const session = await requireSession();
 *   if (!session) return apiError("Unauthorized", 401);
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}
