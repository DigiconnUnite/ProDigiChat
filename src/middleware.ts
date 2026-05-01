import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/signup",
    "/landing",
    "/blog",
    "/features",
    "/pricing",
    "/support",
    "/privacy",
    "/terms",
    "/api/auth",
    "/api/webhooks",
    "/api/whatsapp/webhooks",
  ];
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Allow direct requests for static files in /public to pass through.
  const isStaticAsset = /\.[a-zA-Z0-9]+$/.test(pathname);

  // Check if user is trying to access the landing page or root
  const isLandingPage = pathname === "/landing" || pathname === "/";

  // If trying to access protected route without token (and not on public/landing routes)
  if (!token && !isPublicRoute && !isLandingPage && !isStaticAsset) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If already logged in and trying to access login page, redirect to dashboard
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login, signup, api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
