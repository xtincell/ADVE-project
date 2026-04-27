/**
 * WAKANDA MEGA SEED — Shared Helpers
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

const counts: Record<string, number> = {};

export function track(model: string, n: number = 1): void {
  counts[model] = (counts[model] || 0) + n;
}

export function printSummary(): void {
  console.log("\n============================================================");
  console.log("  WAKANDA SEED — Summary");
  console.log("============================================================");
  const sorted = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  let total = 0;
  for (const [model, count] of sorted) {
    console.log(`  ${model.padEnd(30)} ${String(count).padStart(4)}`);
    total += count;
  }
  console.log("------------------------------------------------------------");
  console.log(`  ${"TOTAL".padEnd(30)} ${String(total).padStart(4)}`);
  console.log("============================================================\n");
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Shift a date by N days */
export function daysAfter(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Shift a date by N hours */
export function hoursAfter(base: Date, hours: number): Date {
  const d = new Date(base);
  d.setHours(d.getHours() + hours);
  return d;
}
