import PayApp from "./PayApp";

// This page depends on the authenticated Convex session, so it must render
// dynamically (not be statically prerendered at build time).
export const dynamic = "force-dynamic";

// Server component — renders the authenticated client app.
// The middleware protects this route, so unauthenticated users are
// redirected to /sign-in before reaching here.
export default function HomePage() {
  return <PayApp />;
}
