"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { reconcile, money, hours, hoursBetween } from "@/lib/calc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  CheckCircle2,
  Clock,
  LogOut,
  MessageCircleQuestion,
  Plus,
  Receipt,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type Step = "rules" | "ledger" | "stub" | "check";

export default function PayApp() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const [step, setStep] = useState<Step>("rules");
  const [rules, setRules] = useState({
    jobTitle: "My job",
    baseRate: 20,
    overtimeThreshold: 40,
    overtimeMultiplier: 1.5,
    premiums: [] as { id: string; name: string; rate: number }[],
  });
  const [shifts, setShifts] = useState<
    { id: string; date: string; start: string; end: string; breakMinutes: number; tags: string[] }[]
  >([]);
  const [stubLines, setStubLines] = useState<Record<string, number>>({});

  const askHelp = useAction(api.help.askHelp);
  const estimateTax = useAction(api.tax.estimateTax);
  const [helpAnswer, setHelpAnswer] = useState<string | null>(null);
  const [helpQuestion, setHelpQuestion] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);
  const [taxEstimate, setTaxEstimate] = useState<any>(null);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    router.push("/sign-in");
    return null;
  }

  const result = reconcile(rules, shifts, stubLines);

  async function handleHelp() {
    if (!helpQuestion.trim()) return;
    setHelpLoading(true);
    setHelpAnswer(null);
    try {
      const res = await askHelp({
        question: helpQuestion,
        context: {
          baseRate: rules.baseRate,
          totalHours: result.totalHours,
          overtimeHours: result.overtimeHours,
          expectedGross: result.expectedGross,
          reportedGross: result.reportedGross,
        },
      });
      setHelpAnswer(res.answer ?? res.error ?? "No response");
    } finally {
      setHelpLoading(false);
    }
  }

  async function handleTax() {
    setTaxEstimate(null);
    try {
      const res = await estimateTax({
        income: result.expectedGross * 52, // annualized
        region: "MN",
        filingStatus: "single",
      });
      setTaxEstimate(res);
    } catch (e) {
      setTaxEstimate({ error: "Tax estimate failed" });
    }
  }

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: "rules", label: "Rules", icon: <ShieldCheck className="size-4" /> },
    { id: "ledger", label: "Ledger", icon: <Clock className="size-4" /> },
    { id: "stub", label: "Stub", icon: <Receipt className="size-4" /> },
    { id: "check", label: "Check", icon: <Calculator className="size-4" /> },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">
            G//C
          </span>
          <div>
            <div className="text-sm font-bold">GROSS CHECK</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              pay reconciliation
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <LogOut className="size-3.5" /> Sign out
        </Button>
      </header>

      {/* Step nav */}
      <nav className="flex border-b">
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition ${
              step === s.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* RULES */}
        {step === "rules" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Your pay rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm text-muted-foreground">Job title</span>
                  <Input
                    value={rules.jobTitle}
                    onChange={(e) => setRules({ ...rules, jobTitle: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-muted-foreground">Base rate ($/hr)</span>
                  <Input
                    type="number"
                    value={rules.baseRate}
                    onChange={(e) => setRules({ ...rules, baseRate: Number(e.target.value) })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-muted-foreground">OT threshold (hrs)</span>
                  <Input
                    type="number"
                    value={rules.overtimeThreshold}
                    onChange={(e) => setRules({ ...rules, overtimeThreshold: Number(e.target.value) })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-muted-foreground">OT multiplier</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={rules.overtimeMultiplier}
                    onChange={(e) => setRules({ ...rules, overtimeMultiplier: Number(e.target.value) })}
                  />
                </label>
              </div>
              <Button className="w-full" size="lg" onClick={() => setStep("ledger")}>
                Next: Log your shifts →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* LEDGER */}
        {step === "ledger" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-primary" /> Your shifts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shifts.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  No shifts yet. Add one below.
                </p>
              )}
              <div className="space-y-2">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{s.date}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.start}–{s.end} · {hours(hoursBetween(s.start, s.end, s.breakMinutes))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShifts(shifts.filter((x) => x.id !== s.id))}
                      aria-label="Remove shift"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <AddShiftForm onAdd={(s) => setShifts([...shifts, s])} />
              <Button className="w-full" size="lg" onClick={() => setStep("stub")}>
                Next: Enter your stub →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STUB */}
        {step === "stub" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" /> What your stub reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the gross amounts from your pay stub for each line.
              </p>
              <div className="space-y-3">
                {result.lines.map((line) => (
                  <label key={line.id} className="block">
                    <span className="mb-1 block text-sm text-muted-foreground">
                      {line.label}{" "}
                      <span className="text-muted-foreground/60">
                        (expected {money(line.expected)})
                      </span>
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      value={stubLines[line.id] ?? ""}
                      onChange={(e) =>
                        setStubLines({ ...stubLines, [line.id]: Number(e.target.value) })
                      }
                      placeholder="0.00"
                    />
                  </label>
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={() => setStep("check")}>
                Next: Check it →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* CHECK */}
        {step === "check" && (
          <div className="space-y-4">
            <Card
              className={`text-center ${
                result.status === "matched"
                  ? "border-emerald-500/50"
                  : result.status === "below"
                    ? "border-amber-500/50"
                    : "border-red-500/50"
              }`}
            >
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-2 text-3xl font-black">
                  {result.status === "matched" ? (
                    <CheckCircle2 className="size-8 text-emerald-500" />
                  ) : result.status === "below" ? (
                    <TrendingDown className="size-8 text-amber-500" />
                  ) : (
                    <TrendingUp className="size-8 text-red-500" />
                  )}
                  {result.status === "matched" ? "MATCHED" : money(result.difference)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {result.status === "matched"
                    ? "Your stub matches your hours."
                    : result.status === "below"
                      ? "You were paid less than expected."
                      : "You were paid more than expected."}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="py-4">
                  <div className="text-xs uppercase text-muted-foreground">Expected gross</div>
                  <div className="text-xl font-bold">{money(result.expectedGross)}</div>
                  <div className="text-xs text-muted-foreground">{hours(result.totalHours)} total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="text-xs uppercase text-muted-foreground">Reported gross</div>
                  <div className="text-xl font-bold">{money(result.reportedGross)}</div>
                  <div className="text-xs text-muted-foreground">{result.overtimeHours}h OT</div>
                </CardContent>
              </Card>
            </div>

            {/* Line breakdown */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Line</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Reported</TableHead>
                      <TableHead className="text-right">Diff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.label}</TableCell>
                        <TableCell className="text-right">{money(line.expected)}</TableCell>
                        <TableCell className="text-right">{money(line.reported)}</TableCell>
                        <TableCell
                          className={`text-right ${
                            line.difference < 0
                              ? "text-amber-500"
                              : line.difference > 0
                                ? "text-emerald-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {line.difference === 0 ? "—" : money(line.difference)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Tax estimate */}
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="text-sm font-medium">Estimated federal tax</div>
                  <div className="text-xs text-muted-foreground">Annualized from this period</div>
                </div>
                <Button variant="outline" size="sm" onClick={handleTax}>
                  Estimate
                </Button>
              </CardContent>
              {taxEstimate && (
                <CardContent className="pt-0 text-sm">
                  {taxEstimate.error ? (
                    <span className="text-destructive">{taxEstimate.error}</span>
                  ) : (
                    <span>
                      ~{money(taxEstimate.federalTaxesOwed)}/yr federal (
                      {(taxEstimate.federalEffectiveRate * 100).toFixed(1)}% effective)
                      {taxEstimate.ficaNote && (
                        <span className="text-muted-foreground"> · FICA needs premium</span>
                      )}
                    </span>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Help agent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircleQuestion className="size-4 text-primary" /> Ask about your pay
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={helpQuestion}
                    onChange={(e) => setHelpQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleHelp()}
                    placeholder="e.g. Is 4 hours of OT at 1.5x right?"
                  />
                  <Button onClick={handleHelp} disabled={helpLoading}>
                    {helpLoading ? "…" : "Ask"}
                  </Button>
                </div>
                {helpAnswer && (
                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    {helpAnswer}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

function AddShiftForm({
  onAdd,
}: {
  onAdd: (s: { id: string; date: string; start: string; end: string; breakMinutes: number; tags: string[] }) => void;
}) {
  const [date, setDate] = useState("2026-08-15");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [breakMinutes, setBreakMinutes] = useState(0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({ id: crypto.randomUUID(), date, start, end, breakMinutes, tags: [] });
      }}
      className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-4"
    >
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">Date</span>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">Start</span>
        <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">End</span>
        <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
      <Button type="submit" className="self-end">
        <Plus className="size-3.5" /> Add shift
      </Button>
    </form>
  );
}
