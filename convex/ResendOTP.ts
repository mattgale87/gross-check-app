import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

// Resend email provider for OTP-based email verification.
// Sends an 8-digit code the user enters to confirm their email.
export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    const length = 8;
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Gross Check <no-reply@galeops.xyz>",
      to: [email],
      subject: "Verify your Gross Check email",
      text: "Your verification code is " + token,
    });

    if (error) {
      throw new Error("Could not send verification email");
    }
  },
});
