"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import PayApp from "./PayApp";

// Public landing + email waitlist gate for unauthenticated visitors.
// Authenticated users see the full app directly (no redirect loop).
export default function Landing() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const joinWaitlist = useMutation(api.leads.joinWaitlist);

  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (isAuthenticated) {
    return <PayApp />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg(null);
    try {
      const res = await joinWaitlist({ email, source: "promo" });
      if (res?.ok) {
        setState("done");
      } else {
        setState("error");
        setMsg(res?.error ?? "Something went wrong. Try again.");
      }
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="size-7 text-primary" />
        </div>
        <h1 className="text-3xl font-black">Gross Check</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
          Verify your pay stub against the hours you actually worked. Catch missed overtime
          and wrong deductions before payday.
        </p>

        <div className="mt-8">
          {state === "done" ? (
            <div className="rounded-xl border border-emerald-500/50 p-6">
              <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
              <p className="font-semibold">You&apos;re on the list!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ll email you when Gross Check is ready.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="text-center"
              />
              <Button type="submit" disabled={state === "loading"} className="w-full" size="lg">
                {state === "loading" ? "Signing up…" : "Get early access"}
              </Button>
              {state === "error" && (
                <p className="text-sm text-destructive">{msg}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Join the waitlist. No spam, no obligation.
              </p>
            </form>
          )}
        </div>

        <div className="mt-8">
          <Button variant="ghost" onClick={() => router.push("/sign-in")}>
            Already have an account? Sign in
          </Button>
        </div>
      </div>
    </main>
  );
}
