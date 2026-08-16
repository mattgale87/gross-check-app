import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // A user's saved pay rules (job, base rate, OT threshold/multiplier, premiums)
  rules: defineTable({
    userId: v.string(),
    jobTitle: v.string(),
    baseRate: v.number(),
    otThreshold: v.number(), // hours before OT kicks in (default 40)
    otMultiplier: v.number(), // default 1.5
    basis: v.union(v.literal("hours"), v.literal("weekly")),
    premiums: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        rate: v.number(), // e.g. 1.5 for 1.5x
        basis: v.union(v.literal("hours"), v.literal("flat")),
      })
    ),
  })
    .index("by_user", ["userId"])
    .searchIndex("by_user_job", { searchField: "jobTitle", filterFields: ["userId"] }),

  // A user's logged shifts
  shifts: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    start: v.string(), // HH:MM
    end: v.string(), // HH:MM
    breakMinutes: v.number(),
    premiumIds: v.array(v.string()), // refs into rules.premiums
    note: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // What the pay stub reports
  stub: defineTable({
    userId: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    reportedGross: v.number(),
    reportedHours: v.number(),
    lines: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        amount: v.number(),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_period", ["userId", "periodStart"]),
});
