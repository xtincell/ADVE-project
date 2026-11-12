/** Conditional content performance and diffusion, distinct from the brand Scoreur. */
import { normalizedPerformance, type Observation, type Annotation } from "./creative-intelligence";

const DAY = 86400000;
const identity = (o: Observation) => JSON.stringify([o.platform, o.accountId, o.externalId ?? o.specimenId]);
const account = (o: Observation) => `${o.platform}:${o.accountId}`;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const quantile = (xs: number[], q: number) => xs.toSorted((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil((xs.length + 1) * q) - 1)]!;

function solve(matrix: number[][], values: number[]) {
  const a = matrix.map((row, i) => [...row, values[i]!]);
  for (let i = 0; i < values.length; i++) {
    let pivot = i;
    for (let j = i + 1; j < a.length; j++) if (Math.abs(a[j]![i]!) > Math.abs(a[pivot]![i]!)) pivot = j;
    [a[i], a[pivot]] = [a[pivot]!, a[i]!];
    if (Math.abs(a[i]![i]!) < 1e-10) return null;
    const divisor = a[i]![i]!;
    for (let k = i; k <= values.length; k++) a[i]![k] = a[i]![k]! / divisor;
    for (let j = 0; j < a.length; j++) if (j !== i) {
      const factor = a[j]![i]!;
      for (let k = i; k <= values.length; k++) a[j]![k] = a[j]![k]! - factor * a[i]![k]!;
    }
  }
  return a.map(row => row.at(-1)!);
}

/** Fixed regularisation, training-only preprocessing, future AND account-disjoint holdout. */
export function conditionalPerformance(target: Observation, corpus: Observation[]) {
  const baseline = normalizedPerformance(target, corpus);
  const empty = (reason: string, counts = { training: 0, validation: 0, accounts: 0 }) => ({
    method: "conditional-log-ridge-v1" as const, state: "INSUFFICIENT_DATA" as const, reason,
    expected: null as number | null, ratio: null as number | null, interval: null as { low: number; high: number; level: number } | null,
    baseline, counts, validation: null as { modelMaeLog: number; baselineMaeLog: number; cutoff: string; accountIds: string[] } | null,
    trainingMetricIds: [] as string[], validationMetricIds: [] as string[], predictors: [] as string[],
    limitations: ["Association prédictive, causalité non établie.", "Pas de budget publicitaire ou d'audience à publication inventés."],
  });
  if (baseline.ratio == null || target.value == null) return empty(baseline.reason);
  // A single measurement per content; only data available before the target publication.
  const prior = corpus.filter(o => account(o) !== account(target) && o.platform === target.platform && o.format === target.format && o.sector === target.sector && o.countryCode === target.countryCode && o.observedAt < target.publishedAt && o.publishedAt < target.publishedAt);
  const unique = new Map<string, Observation>();
  for (const o of prior.toSorted((a, b) => b.observedAt.getTime() - a.observedAt.getTime())) if (!unique.has(identity(o))) unique.set(identity(o), o);
  const rows = [...unique.values()].map(o => ({ o, b: normalizedPerformance(o, prior) })).filter(r => r.b.expected != null && r.o.value != null && Number.isFinite(r.o.value));
  const ordered = rows.toSorted((a, b) => a.o.observedAt.getTime() - b.o.observedAt.getTime());
  if (ordered.length < 60) return empty("INSUFFICIENT_COMPARABLE_HISTORY");
  const cutoff = ordered[Math.floor(ordered.length * 0.65)]!.o.observedAt;
  const accounts = [...new Set(rows.map(r => account(r.o)))].sort();
  if (accounts.length < 8) return empty("INSUFFICIENT_INDEPENDENT_ACCOUNTS");
  const validationAccounts = new Set(accounts.filter((_, i) => i % 4 === 0));
  const train = rows.filter(r => !validationAccounts.has(account(r.o)) && r.o.observedAt < cutoff);
  const validation = rows.filter(r => validationAccounts.has(account(r.o)) && r.o.observedAt >= cutoff);
  const counts = { training: train.length, validation: validation.length, accounts: accounts.length };
  if (train.length < 30 || validation.length < 12) return empty("INSUFFICIENT_DISJOINT_VALIDATION", counts);
  // Topic is a reviewed description, never generated from the measured outcome.
  const topics = [...new Set(train.map(r => (r.o.annotationObservedAt && r.o.annotationObservedAt <= r.o.observedAt ? r.o.annotation?.topic : undefined)).filter((v): v is string => !!v))].sort().slice(0, 12);
  const features = (o: Observation, expected: number) => {
    const day = o.publishedAt.getUTCMonth() * 30 + o.publishedAt.getUTCDate();
    return [Math.log1p(expected), Math.log1p((o.observedAt.getTime() - o.publishedAt.getTime()) / DAY), Math.sin(day * 2 * Math.PI / 365.25), Math.cos(day * 2 * Math.PI / 365.25), ...topics.map(t => o.annotationObservedAt && o.annotationObservedAt <= o.observedAt && o.annotation?.topic === t ? 1 : 0)];
  };
  const raw = train.map(r => features(r.o, r.b.expected!));
  const targetFeatures = features(target, baseline.expected!);
  if ([0, 1].some(j => targetFeatures[j]! < Math.min(...raw.map(r => r[j]!)) || targetFeatures[j]! > Math.max(...raw.map(r => r[j]!)))) return empty("OUTSIDE_OBSERVED_BASELINE_OR_AGE_RANGE", counts);
  const means = raw[0]!.map((_, j) => mean(raw.map(x => x[j]!)));
  const scales = means.map((m, j) => Math.sqrt(mean(raw.map(x => (x[j]! - m) ** 2))) || 1);
  const transform = (x: number[]) => [1, ...x.map((v, j) => (v - means[j]!) / scales[j]!)];
  const x = raw.map(transform), y = train.map(r => Math.log1p(r.o.value!)), p = x[0]!.length;
  const gram = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => x.reduce((s, row) => s + row[a]! * row[b]!, 0) + (a === b && a > 0 ? 4 : 0)));
  const weights = solve(gram, Array.from({ length: p }, (_, a) => x.reduce((s, row, i) => s + row[a]! * y[i]!, 0)));
  if (!weights) return empty("UNSTABLE_FIT", counts);
  const predict = (o: Observation, expected: number) => transform(features(o, expected)).reduce((s, v, i) => s + v * weights[i]!, 0);
  const errors = validation.map(r => Math.abs(Math.log1p(r.o.value!) - predict(r.o, r.b.expected!)));
  const modelMaeLog = mean(errors), baselineMaeLog = mean(validation.map(r => Math.abs(Math.log1p(r.o.value!) - Math.log1p(r.b.expected!))));
  if (!Number.isFinite(modelMaeLog) || modelMaeLog >= baselineMaeLog * 0.98) return { ...empty("NO_VALIDATED_GAIN_OVER_ACCOUNT_BASELINE", counts), validation: { modelMaeLog, baselineMaeLog, cutoff: cutoff.toISOString(), accountIds: [...validationAccounts] } };
  const logExpected = predict(target, baseline.expected!), expected = Math.expm1(logExpected), radius = quantile(errors, 0.9);
  if (!Number.isFinite(expected) || expected <= 0 || Math.expm1(logExpected + radius) > Number.MAX_SAFE_INTEGER || !Number.isFinite(radius)) return empty("INVALID_EXPECTATION", counts);
  return { ...empty("OBSERVED_PREDICTIVE_ASSOCIATION", counts), state: "CALIBRATED" as const, expected, ratio: target.value / expected,
    interval: { low: Math.max(0, Math.expm1(logExpected - radius)), high: Math.expm1(logExpected + radius), level: 0.9 },
    validation: { modelMaeLog, baselineMaeLog, cutoff: cutoff.toISOString(), accountIds: [...validationAccounts] },
    trainingMetricIds: train.map(r => r.o.metricId), validationMetricIds: validation.map(r => r.o.metricId),
    predictors: ["priorAccountMedian", "publicationAge", "calendarSin", "calendarCos", ...topics.map(t => `reviewedTopic:${t}`)],
    limitations: [...empty("").limitations, "Intervalle empirique sur comptes et période réservés ; sa couverture future n'est pas garantie."],
  };
}

/** Diffusion in our observed corpus, never an estimate of global saturation or origin. */
export function patternTrajectory(rows: Observation[], signature: Pick<Annotation, "hook" | "narrative" | "visual">, asOf: Date, weeks = 8) {
  const unique = new Map<string, Observation>();
  for (const o of rows.filter(o => o.publishedAt <= asOf && o.observedAt <= asOf).toSorted((a, b) => b.observedAt.getTime() - a.observedAt.getTime())) if (!unique.has(identity(o))) unique.set(identity(o), o);
  const contents = [...unique.values()];
  const matches = (o: Observation) => o.annotation?.hook === signature.hook && o.annotation?.narrative === signature.narrative && o.annotation?.visual === signature.visual;
  const contexts = [...new Set(contents.map(o => JSON.stringify([o.platform, o.countryCode, o.sector])))].sort();
  const series = contexts.map(context => {
    const [platform, countryCode, sector] = JSON.parse(context) as [string, string, string];
    const scoped = contents.filter(o => o.platform === platform && o.countryCode === countryCode && o.sector === sector);
    const periods = Array.from({ length: weeks }, (_, i) => {
      const end = new Date(asOf.getTime() - (weeks - 1 - i) * 7 * DAY), start = new Date(end.getTime() - 7 * DAY);
      const window = scoped.filter(o => o.publishedAt >= start && o.publishedAt < end), annotated = window.filter(o => o.annotation), adopted = annotated.filter(matches);
      const accounts = [...new Set(annotated.map(account))].sort();
      return { start: start.toISOString(), end: end.toISOString(), observed: window.length, annotated: annotated.length, annotationCoverage: window.length ? annotated.length / window.length : null, matching: adopted.length, accounts, adoptingAccounts: new Set(adopted.map(account)).size, share: annotated.length ? adopted.length / annotated.length : null };
    });
    const recent = periods.slice(-3), sufficient = recent.every(p => p.annotated >= 10 && p.accounts.length >= 3 && (p.annotationCoverage ?? 0) >= 0.6);
    const stableAccounts = recent[0]!.accounts.filter(a => recent.every(p => p.accounts.includes(a)));
    const stableCoverage = sufficient && stableAccounts.length >= 3 && recent.every(p => stableAccounts.length / p.accounts.length >= 0.6);
    const [a, b, c] = recent.map(p => p.share ?? 0);
    const state = !stableCoverage ? "INSUFFICIENT_DATA" : c! > b! + 0.1 && b! > a! ? "RISING" : c! < b! - 0.1 && b! < a! ? "DECLINING" : b! > a! + 0.1 && c! <= b! ? "PEAK_OBSERVED" : "STABLE";
    return { platform, countryCode, sector, periods, state, stableAccounts: stableAccounts.length, firstCollectedAt: scoped.filter(matches).map(o => o.observedAt.toISOString()).sort()[0] ?? null };
  });
  const chronology = series.filter(s => s.firstCollectedAt).toSorted((a, b) => a.firstCollectedAt!.localeCompare(b.firstCollectedAt!)).map(s => ({ platform: s.platform, countryCode: s.countryCode, at: s.firstCollectedAt }));
  return { method: "observed-corpus-weekly-v2", asOf: asOf.toISOString(), series, chronology, limitation: "Chronologie des premiers imports dans les sources collectées ; proportions parmi les contenus annotés, couverture indiquée ; origine, migration causale et saturation du marché non établies." };
}
