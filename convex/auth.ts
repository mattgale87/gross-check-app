import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Convex Auth wraps Better Auth and stores sessions in Convex.
// Password-based email sign-up/sign-in (no magic link needed).
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
