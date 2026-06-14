// ============================================================
// Opus8 — Token Cost Calculator (PHP)
// Uses 2x markup for business profitability
// ============================================================

import { RATES, USD_TO_PHP, PROFIT_MARKUP } from '@shared/constants';
import type { TokenUsage, BillingResult } from '@shared/types';

/**
 * Calculate the PHP cost for token usage.
 * Formula: (tokens / 1_000_000) * rate_per_million * markup
 */
export function calculateCost(tokens: number, ratePerMillion: number): number {
  return (tokens / 1_000_000) * ratePerMillion * PROFIT_MARKUP;
}

/**
 * Calculate the full billing result for a chat completion.
 */
export function calculateBilling(usage: TokenUsage): BillingResult {
  const rates = RATES[usage.model];
  const inputCost = calculateCost(usage.inputTokens, rates.inputPerMillion);
  const outputCost = calculateCost(usage.outputTokens, rates.outputPerMillion);
  const totalCost = inputCost + outputCost;

  return {
    costPhp: Math.round(totalCost * 10000) / 10000, // 4 decimal places
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    rateApplied: {
      input: rates.inputPerMillion,
      output: rates.outputPerMillion,
    },
    remainingBalance: 0, // Set by caller after DB update
  };
}

/**
 * Format PHP amount for display.
 */
export function formatPhp(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

/**
 * Check if user can afford the estimated cost.
 */
export function canAfford(balance: number, estimatedCost: number): boolean {
  return balance >= estimatedCost;
}

/**
 * Convert DeepSeek USD pricing to PHP.
 * DeepSeek pricing (as of 2026):
 *   - V4 Pro:  $0.435/M input,  $0.87/M output
 *   - V4 Flash: $0.14/M input,  $0.28/M output
 */
export const DEEPSEEK_USD_RATES = {
  pro: { input: 0.435, output: 0.87 },
  flash: { input: 0.14, output: 0.28 },
};

/**
 * Verify the 2x markup rates match spec:
 *   Flash Input:  $0.14 * 60.77 * 2 = ₱17.02 ✓
 *   Flash Output: $0.28 * 60.77 * 2 = ₱34.04 ✓
 *   Pro Input:    $0.435 * 60.77 * 2 = ₱52.88 ✓
 *   Pro Output:   $0.87 * 60.77 * 2 = ₱105.74 ✓
 */
export function validateRates() {
  for (const tier of ['pro', 'flash'] as const) {
    const ds = DEEPSEEK_USD_RATES[tier];
    const expected = RATES[tier];
    const calcInput = ds.input * USD_TO_PHP * PROFIT_MARKUP;
    const calcOutput = ds.output * USD_TO_PHP * PROFIT_MARKUP;
    console.assert(
      Math.abs(calcInput - expected.inputPerMillion) < 0.1,
      `Rate mismatch: ${tier} input`
    );
    console.assert(
      Math.abs(calcOutput - expected.outputPerMillion) < 0.1,
      `Rate mismatch: ${tier} output`
    );
  }
}
