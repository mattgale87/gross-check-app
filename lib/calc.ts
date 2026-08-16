// Pay reconciliation calculation logic (ported from the vanilla PWA calc.mjs)

export const round = (value: number, places = 2) => {
  const factor = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

export function hoursBetween(start: string, end: string, breakMinutes = 0) {
  const parse = (value: string) => {
    const [hours, minutes] = String(value).split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes))
      throw new Error(`Invalid time: ${value}`);
    return hours * 60 + minutes;
  };
  const startMinutes = parse(start);
  let endMinutes = parse(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  const worked = endMinutes - startMinutes - Number(breakMinutes || 0);
  if (worked <= 0) throw new Error("Shift must contain positive paid time");
  return round(worked / 60, 4);
}

export interface Premium {
  id: string;
  name: string;
  rate: number;
}

export interface PayRules {
  baseRate: number;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  overtimeBasis?: "base" | "weighted";
  premiums: Premium[];
}

export interface Shift {
  start: string;
  end: string;
  breakMinutes: number;
  tags?: string[];
}

export function calculateExpected(rules: PayRules, shifts: Shift[]) {
  const baseRate = Number(rules.baseRate || 0);
  const overtimeThreshold = Number(rules.overtimeThreshold ?? 40);
  const overtimeMultiplier = Number(rules.overtimeMultiplier ?? 1.5);
  const premiums = Array.isArray(rules.premiums) ? rules.premiums : [];
  if (baseRate < 0 || overtimeThreshold < 0 || overtimeMultiplier < 1)
    throw new Error("Invalid pay rules");

  const detailedShifts = shifts.map((shift) => ({
    ...shift,
    hours: hoursBetween(shift.start, shift.end, shift.breakMinutes),
  }));
  const totalHours = round(
    detailedShifts.reduce((sum, shift) => sum + shift.hours, 0),
    4
  );
  const regularHours = Math.min(totalHours, overtimeThreshold);
  const overtimeHours = Math.max(0, round(totalHours - overtimeThreshold, 4));

  const premiumLines = premiums.map((premium) => {
    const hours = round(
      detailedShifts
        .filter((shift) => (shift.tags || []).includes(premium.id))
        .reduce((sum, shift) => sum + shift.hours, 0),
      4
    );
    return {
      id: premium.id,
      label: premium.name,
      hours,
      rate: Number(premium.rate || 0),
      expected: round(hours * Number(premium.rate || 0)),
    };
  });

  const totalPremiums = round(
    premiumLines.reduce((sum, line) => sum + line.expected, 0)
  );
  const straightEarnings = round(totalHours * baseRate + totalPremiums);
  const weightedRegularRate =
    totalHours > 0 ? round(straightEarnings / totalHours, 6) : baseRate;
  const overtimeRateBasis =
    rules.overtimeBasis === "base" ? baseRate : weightedRegularRate;
  const overtimePremium = round(
    overtimeHours * (overtimeMultiplier - 1) * overtimeRateBasis
  );

  const lines = [
    {
      id: "regular",
      label: "Regular base",
      hours: regularHours,
      rate: baseRate,
      expected: round(regularHours * baseRate),
    },
    {
      id: "overtime",
      label: "Overtime",
      hours: overtimeHours,
      rate: baseRate,
      expected: round(overtimeHours * baseRate + overtimePremium),
    },
    ...premiumLines,
  ];
  const expectedGross = round(lines.reduce((sum, line) => sum + line.expected, 0));

  return {
    totalHours,
    regularHours,
    overtimeHours,
    totalPremiums,
    weightedRegularRate,
    overtimeRateBasis,
    overtimePremium,
    expectedGross,
    lines,
    shifts: detailedShifts,
  };
}

export function reconcile(
  rules: PayRules,
  shifts: Shift[],
  reported: Record<string, number> = {}
) {
  const expected = calculateExpected(rules, shifts);
  const lines: {
    id: string;
    label: string;
    hours: number | null;
    rate: number | null;
    expected: number;
    reported: number;
    difference: number;
  }[] = expected.lines.map((line) => {
    const reportedValue = round(Number(reported[line.id] || 0));
    return {
      ...line,
      reported: reportedValue,
      difference: round(reportedValue - line.expected),
    };
  });
  const known = new Set(lines.map((line) => line.id));
  const otherReported = round(
    Object.entries(reported)
      .filter(([key]) => !known.has(key))
      .reduce((sum, [, value]) => sum + Number(value || 0), 0)
  );
  if (otherReported)
    lines.push({
      id: "other",
      label: "Other reported gross",
      hours: null as number | null,
      rate: null as number | null,
      expected: 0,
      reported: otherReported,
      difference: otherReported,
    });
  const reportedGross = round(lines.reduce((sum, line) => sum + line.reported, 0));
  const difference = round(reportedGross - expected.expectedGross);
  const status =
    Math.abs(difference) < 0.01
      ? "matched"
      : difference < 0
        ? "below"
        : "above";
  return { ...expected, lines, reportedGross, difference, status };
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
export const hours = (value: number) => `${round(value, 2).toFixed(2)}h`;
