/**
 * M2: entropy-signal.ts — S9 Knowledge Entropy + Order Parameter
 *
 * Shannon entropy over tier and category distributions.
 * Order parameter maps system state to rigid / edge-of-chaos / chaotic zones.
 */

import type {
  TierDistribution,
  CategoryDistribution,
  EntropyResult,
  OrderResult,
} from "./types.js";

// ============================================================================
// Helpers
// ============================================================================

/** Shannon entropy: H = -Σ p_i · log₂(p_i). Returns 0 for empty/single-class. */
function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c <= 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  return h;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Dual-dimension Shannon entropy.
 *
 * H = -Σ p_i · log₂(p_i), normalized by H_max = log₂(n)
 * Combined = 0.6 × tierNorm + 0.4 × catNorm
 * Interpretation: tierNorm < rigidThreshold → rigid; > chaoticThreshold → chaotic
 */
export function computeAtomEntropy(
  tierDist: TierDistribution[],
  catDist: CategoryDistribution[],
  options?: { rigidThreshold?: number; chaoticThreshold?: number; tierWeight?: number },
): EntropyResult {
  const rigid = options?.rigidThreshold ?? 0.3;
  const chaotic = options?.chaoticThreshold ?? 0.85;
  const tierW = options?.tierWeight ?? 0.6;

  const tierCounts = tierDist.map((d) => d.count);
  const catCounts = catDist.map((d) => d.count);

  const tierH = shannonEntropy(tierCounts);
  const catH = shannonEntropy(catCounts);

  const tierMax = tierDist.length > 1 ? Math.log2(tierDist.length) : 1;
  const catMax = catDist.length > 1 ? Math.log2(catDist.length) : 1;

  const tierNorm = tierH / tierMax;
  const catNorm = catH / catMax;
  const combined = tierW * tierNorm + (1 - tierW) * catNorm;

  let interpretation: EntropyResult["interpretation"];
  if (tierNorm < rigid) interpretation = "rigid";
  else if (tierNorm > chaotic) interpretation = "chaotic";
  else interpretation = "healthy";

  const totalAtoms = tierCounts.reduce((a, b) => a + b, 0);
  const details =
    `${totalAtoms} atoms: tier H=${tierNorm.toFixed(3)}, cat H=${catNorm.toFixed(3)}, ` +
    `combined=${combined.toFixed(3)} → ${interpretation}`;

  return {
    tierEntropy: tierH,
    tierNormalized: tierNorm,
    categoryEntropy: catH,
    categoryNormalized: catNorm,
    combinedScore: combined,
    interpretation,
    details,
  };
}

/**
 * Order parameter = 0.5×entropy + 0.5×chaosCenter
 *
 * chaosCenter = p_固×0 + p_觀×0.5 + p_臨×1.0
 * Zone: rigid (<0.3) | edge-of-chaos (0.3-0.6) | chaotic (>0.6)
 */
export function computeOrderParameter(
  tierCounts: TierDistribution[],
  options?: { rigidBound?: number; chaoticBound?: number },
): OrderResult {
  const rigidBound = options?.rigidBound ?? 0.3;
  const chaoticBound = options?.chaoticBound ?? 0.6;

  const counts = tierCounts.map((d) => d.count);
  const total = counts.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return {
      orderParameter: 0,
      entropy: 0,
      zone: "rigid",
      signal: { action: "none", reason: "no atoms", urgency: "low" },
      proportions: { fixed: 0, observed: 0, temporary: 0 },
    };
  }

  // Map tier names to proportions
  const tierMap: Record<string, number> = {};
  for (const d of tierCounts) tierMap[d.tier] = d.count / total;
  const pFixed = tierMap["固"] ?? 0;
  const pObserved = tierMap["觀"] ?? 0;
  const pTemporary = tierMap["臨"] ?? 0;

  // Chaos center: weighted average toward temporary
  const chaosCenter = pFixed * 0 + pObserved * 0.5 + pTemporary * 1.0;

  // Normalized entropy for 3 tiers
  const h = shannonEntropy(counts);
  const hMax = Math.log2(tierCounts.length || 1) || 1;
  const hNorm = h / hMax;

  const op = 0.5 * hNorm + 0.5 * chaosCenter;

  let zone: OrderResult["zone"];
  if (op < rigidBound) zone = "rigid";
  else if (op > chaoticBound) zone = "chaotic";
  else zone = "edge-of-chaos";

  // Generate signal
  let action: OrderResult["signal"]["action"] = "none";
  let reason = "";
  let urgency: OrderResult["signal"]["urgency"] = "low";

  if (zone === "rigid") {
    action = "increase-promotion";
    reason = `OP=${op.toFixed(3)} < ${rigidBound}: system over-consolidated, consider promoting [臨]→[觀]`;
    urgency = op < rigidBound * 0.5 ? "high" : "medium";
  } else if (zone === "chaotic") {
    action = "increase-decay";
    reason = `OP=${op.toFixed(3)} > ${chaoticBound}: too many temporary atoms, consider decay/consolidation`;
    urgency = op > (1 + chaoticBound) / 2 ? "high" : "medium";
  } else {
    reason = `OP=${op.toFixed(3)}: edge-of-chaos, healthy adaptive zone`;
  }

  return {
    orderParameter: op,
    entropy: hNorm,
    zone,
    signal: { action, reason, urgency },
    proportions: { fixed: pFixed, observed: pObserved, temporary: pTemporary },
  };
}
