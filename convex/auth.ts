import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { Resend } from "resend";

// Convex Auth wraps Better Auth and stores sessions in Convex.
// Email/password auth with Resend for verification emails.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Email({
      // Send a verification code to the user's email via Resend.
      async sendVerificationRequest({ identifier, url }) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          console.error("RESEND_API_KEY not configured");
          return;
        }
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "Gross Check <no-reply@galeops.xyz>",
          to: identifier,
          subject: "Your Gross Check verification code",
          html: `<p>Use this link to verify your email and sign in:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    }),
  ],
});
