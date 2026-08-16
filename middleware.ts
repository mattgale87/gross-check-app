import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/", "/sign-in"]);

// Use the env var, with a hardcoded production fallback.
// This ensures the middleware can connect to Convex even if the env var
// isn't inlined at build time on Vercel.
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  "https://stoic-lemur-526.convex.cloud";

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (!isPublicPage(request) && !(await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/sign-in");
    }
  },
  { convexUrl }
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};