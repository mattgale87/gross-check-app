import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Server-side LLM help agent via OpenRouter (free model: Nemotron 3 Super 120B).
// Keys stay server-side — never exposed to the client.
export const askHelp = action({
  args: {
    question: v.string(),
    context: v.optional(
      v.object({
        baseRate: v.optional(v.number()),
        totalHours: v.optional(v.number()),
        overtimeHours: v.optional(v.number()),
        expectedGross: v.optional(v.number()),
        reportedGross: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // OWASP A01: require an authenticated user before running the action.
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { error: "Not authenticated" };
    }
    // OWASP A03: validate and bound the question length to prevent abuse.
    const question = args.question.trim().slice(0, 2000);
    if (question.length === 0) {
      return { error: "Question is empty" };
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { error: "OPENROUTER_API_KEY not configured" };
    }
    const model = process.env.HELP_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

    // Build a system prompt that grounds the model in the user's actual numbers
    // so it answers from their data, not generic advice.
    const payCtx = args.context;
    const contextBlock = payCtx
      ? `\nThe user's current pay data:\n` +
        (payCtx.baseRate != null ? `- Base rate: $${payCtx.baseRate}/hr\n` : "") +
        (payCtx.totalHours != null ? `- Total hours: ${payCtx.totalHours}\n` : "") +
        (payCtx.overtimeHours != null ? `- Overtime hours: ${payCtx.overtimeHours}\n` : "") +
        (payCtx.expectedGross != null ? `- Expected gross: $${payCtx.expectedGross}\n` : "") +
        (payCtx.reportedGross != null ? `- Reported gross: $${payCtx.reportedGross}\n` : "")
      : "";

    const system = `You are a helpful assistant inside a pay-stub reconciliation app for shift workers. You help people understand their pay: overtime math, differentials, deductions, and whether a discrepancy is worth raising. Be concise, practical, and non-judgmental. If the user's numbers are provided, use them. If you're not sure about a legal question, say so and suggest they check with their state labor department.${contextBlock}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
        max_tokens: 300,
      }),
    });
    if (!res.ok) {
      return { error: `OpenRouter returned ${res.status}` };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { error: "No response from model" };
    }
    return { answer: content, model };
  },
});
