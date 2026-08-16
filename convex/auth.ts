import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./ResendOTP";

// Convex Auth wraps Better Auth and stores sessions in Convex.
// Password-based email sign-up/sign-in with Resend OTP email verification.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ verify: ResendOTP })],
});
