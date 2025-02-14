// Auth middleware disabled for MVP
/*
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();

  // List of public paths that don't require authentication
  const publicPaths = ["/auth/signin"];

  // Check if the current path is public
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // If the path is public, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // If not authenticated and not on a public path, redirect to signin
  if (!session) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // If authenticated and trying to access signin page, redirect to home
  if (session && request.nextUrl.pathname.startsWith("/auth/signin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Configure which paths should be handled by middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     *//*
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
*/
