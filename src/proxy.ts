import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next 16 renamed Middleware → Proxy (functionality unchanged). Clerk's clerkMiddleware runs here.
// Public: QStash job callbacks (signature-verified, not Clerk) + auth pages.
const isPublic = createRouteMatcher(["/", "/api/jobs(.*)", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
