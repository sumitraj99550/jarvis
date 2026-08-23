/**
 * Published Gemini API pricing (as of this writing), in USD per 1M tokens.
 * Used purely to estimate "what this would cost on a paid plan" — actual
 * cost on the free tier this app is built for is $0. Source: Google AI
 * pricing page. If pricing changes, only this file needs updating.
 */

type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

const PRICING: Record<string, ModelPricing> = {
  "gemini-3.5-flash": { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  "text-embedding-004": { inputPerMillion: 0, outputPerMillion: 0 }, // free
};

const DEFAULT_PRICING: ModelPricing = {
  inputPerMillion: 0.075,
  outputPerMillion: 0.3,
};

/** Returns estimated cost in micros (1,000,000 micros = $1) for precision without floats. */
export function estimateCostMicros(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = PRICING[model] ?? DEFAULT_PRICING;
  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;
  return Math.round((inputCost + outputCost) * 1_000_000);
}

/** Cutoff timestamp for "last 30 days" usage queries. */
export function usageWindowSince(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

export function microsToDisplayCost(micros: number): string {
  const dollars = micros / 1_000_000;
  if (dollars === 0) return "$0.00";
  if (dollars < 0.01) return `$${dollars.toFixed(5)}`;
  return `$${dollars.toFixed(4)}`;
}
