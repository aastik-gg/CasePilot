import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Next 16 renamed Middleware → Proxy (functionality unchanged). Clerk's clerkMiddleware runs here.
// Public: QStash job callbacks (signature-verified, not Clerk) + auth pages.
const isPublic = createRouteMatcher(["/", "/api/jobs(.*)", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();

  // Redirect signed-in users away from the landing page
  if (req.nextUrl.pathname === "/") {
    const { userId } = await auth();
    if (userId) {
      return NextResponse.redirect(new URL("/contracts", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
