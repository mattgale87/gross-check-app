import Landing from "./Landing";

// This page depends on the authenticated Convex session, so it must render
// dynamically (not be statically prerendered at build time).
export const dynamic = "force-dynamic";

// Server component — renders the authenticated client app.
// Landing handles the auth gate: unauthenticated visitors see the waitlist,
// authenticated users are routed to the app.
export default function HomePage() {
  return <Landing />;
}
