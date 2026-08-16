import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Server-side tax estimate via API Ninjas (free tier).
// Keys stay server-side — never exposed to the client.
export const estimateTax = action({
  args: {
    income: v.number(),
    region: v.string(), // US state code, e.g. "MN"
    filingStatus: v.union(
      v.literal("single"),
      v.literal("married"),
      v.literal("head_of_household")
    ),
  },
  handler: async (ctx, args) => {
    // OWASP A01: require an authenticated user before running the action.
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { error: "Not authenticated" };
    }
    // OWASP A03: validate input bounds — income must be sane, region a 2-letter US state.
    if (!Number.isFinite(args.income) || args.income < 0 || args.income > 10_000_000) {
      return { error: "Invalid income" };
    }
    if (!/^[A-Z]{2}$/.test(args.region)) {
      return { error: "Invalid region" };
    }
    const apiKey = process.env.API_NINJAS_KEY;
    if (!apiKey) {
      return { error: "API_NINJAS_KEY not configured" };
    }
    const url = `https://api.api-ninjas.com/v1/incometaxcalculator?country=US&income=${args.income}&region=${args.region}&filing_status=${args.filingStatus}`;
    const res = await fetch(url, { headers: { "X-Api-Key": apiKey } });
    if (!res.ok) {
      return { error: `API Ninjas returned ${res.status}` };
    }
    const data = await res.json();
    return {
      federalEffectiveRate: data.federal_effective_rate,
      federalTaxesOwed: data.federal_taxes_owed,
      taxYear: data.tax_year,
      // FICA requires premium; note it so the UI can show a partial estimate
      ficaNote: data.fica_social_security === "premium subscription required",
    };
  },
});
