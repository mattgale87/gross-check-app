import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Public waitlist signup — intentionally does NOT require authentication so
// promo/landing traffic can be captured with zero friction (email only).
export const joinWaitlist = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // OWASP A03: validate + normalize the email; bound the source string.
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Please enter a valid email address" };
    }
    const source = (args.source || "landing").slice(0, 80);

    // Dedupe: skip if this email already signed up.
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      return { ok: true, existing: true };
    }

    await ctx.db.insert("leads", {
      email,
      source,
      createdAt: Date.now(),
    });
    return { ok: true, existing: false };
  },
});
