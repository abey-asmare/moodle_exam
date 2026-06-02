import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes that should always be publicly accessible
const PUBLIC_PATHS = [
  "/login", // the login page itself
  "/api/auth/login", // the login API
  "/api/examinations/shared/questions",
  "/api/examinations/shared/answers",
];

// Any path that starts with '/s' is public (your (shared) group)
function isPublicPath(pathname: string) {
  if (pathname.startsWith("/s")) return true;
  return PUBLIC_PATHS.includes(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow all public paths without any check
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 2. For everything else, check the authentication cookie
  const token = request.cookies.get("auth-token")?.value;

  // Replace this with your actual token validation
  const VALID_TOKEN = process.env.ACCESS_TOKEN || "my-secret-token";

  if (!token || token !== VALID_TOKEN) {
    // Redirect to login, preserving the original destination as a query param
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Token is valid – allow the request
  return NextResponse.next();
}

// Apply the middleware to all routes except static files, Next.js internals, etc.
export const config = {
  matcher: ["/((?!_next|favicon.ico|api/auth/login).*)"],
};
