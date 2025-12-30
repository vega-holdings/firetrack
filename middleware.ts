import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for route protection
 * Uses JWT token check without importing full auth module to avoid Edge Runtime issues
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/settings", "/tracking"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Auth routes (signin, signup, etc.)
  const isAuthRoute = pathname.startsWith("/auth/");

  // Check for session token (next-auth uses this cookie name)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  // Redirect authenticated users away from auth pages (except signout)
  if (isAuthRoute && isLoggedIn && pathname !== "/auth/signout") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match protected routes and auth routes
    "/dashboard/:path*",
    "/settings/:path*",
    "/tracking/:path*",
    "/auth/:path*",
  ],
};
