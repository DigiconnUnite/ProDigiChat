import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/api/auth"];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Check if user is trying to access the landing page or root
  const isLandingPage = request.nextUrl.pathname === "/landing" || request.nextUrl.pathname === "/";

  // If trying to access protected route without token (and not on public/landing routes)
  if (!token && !isPublicRoute && !isLandingPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If already logged in and trying to access login page, redirect to dashboard
  if (token && request.nextUrl.pathname === "/login") {
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
