import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Route protection map:
//   /admin/**  -> ADMIN only
//   /staff/**  -> ADMIN or STAFF (owners can also see the kitchen queue)
//   /kiosk/**  -> public (in-store self-service, no login)
//   /order/**  -> public (QR ordering, no login)
//   /login     -> public
export const proxy = auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const role = session?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isStaffRoute = nextUrl.pathname.startsWith("/staff");

  if (isAdminRoute && role !== "ADMIN") {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isStaffRoute && role !== "ADMIN" && role !== "STAFF") {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets and API auth routes themselves.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
