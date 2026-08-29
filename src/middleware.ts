import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect the dashboard and write endpoint with HTTP Basic Auth.
// Set DASHBOARD_PASSWORD in .env.local (dev) and in Vercel env vars (prod).
// If DASHBOARD_PASSWORD is not set, the routes are left unprotected — useful
// for local dev, but make sure it's set in production.

export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    // fail open only in local dev — production without the env var stays locked
    if (process.env.NODE_ENV === "development") return NextResponse.next();
    return new NextResponse("Not configured", { status: 401 });
  }

  // Allow public reads so the site can fetch the lists without auth.
  if (
    (req.nextUrl.pathname === "/api/hidden" ||
      req.nextUrl.pathname === "/api/tags") &&
    req.method === "GET"
  ) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const colonIdx = decoded.indexOf(":");
      const providedPw = colonIdx === -1 ? decoded : decoded.slice(colonIdx + 1);
      if (providedPw === password) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Dashboard"' },
  });
}

export const config = {
  matcher: ["/work/dashboard", "/api/hidden", "/api/tags"],
};
