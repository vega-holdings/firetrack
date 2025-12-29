import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname } = req.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/settings", "/tracking"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Auth routes (signin, signup, etc.)
  const isAuthRoute = pathname.startsWith("/auth/");

  // API routes that should be protected
  const isProtectedApi =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/chat"); // Chat can be public for now

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname);
    return Response.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.nextUrl)
    );
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isLoggedIn && pathname !== "/auth/signout") {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Optional: Protect certain API routes
  if (isProtectedApi && !isLoggedIn) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export const config = {
  matcher: [
    // Skip static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
