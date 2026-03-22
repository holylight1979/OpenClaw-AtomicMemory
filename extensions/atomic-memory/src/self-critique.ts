/**
 * OETAV Phase C — Self-Critique (Spec M5, partial)
 *
 * Deterministic devil's advocate gate (Invariant #13).
 * critiqueProposal is a stub for Phase D (LLM-based).
 *
 * The devil's advocate challenges proposals with weak evidence
 * before they reach execution.
 */

import type {
  IterationProposal,
  EvidenceBucket,
  MaturityPhase,
  DevilsAdvocateResult,
  DevilsAdvocateChallenge,
  CritiqueResult,
} from "./types.js";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OVER_SPECULATION_THRESHOLD = 0.7;

/** Keywords that suggest theoretical justification. */
const THEORY_KEYWORDS = [
  "based on theory",
  "according to",
  "banach",
  "lyapunov",
  "entropy",
  "contraction",
  "equilibrium",
  "convergence",
  "thermodynamic",
  "self-organized",
];

// ============================================================================
// Devil's Advocate — Deterministic Rule-Based (Invariant #13)
// ============================================================================

/**
 * Challenge proposals with weak evidence before execution.
 *
 * Three rules (from Spec M5):
 *   (a) Evidence < 3 data points + references theory → challenge
 *   (b) Targets > 3 files + evidence from only 1 signal type → challenge
 *   (c) Description contains theory keywords but no quantitative metric → challenge
 *
 * overSpeculationScore > threshold → fail
 * Any high-severity challenge → fail
 */
export function devilsAdvocate(
  proposal: IterationProposal,
  evidence: EvidenceBucket[],
  context: { maturityPhase: MaturityPhase; totalProposals: number },
  overSpeculationThreshold = DEFAULT_OVER_SPECULATION_THRESHOLD,
): DevilsAdvocateResult {
  const challenges: DevilsAdvocateChallenge[] = [];

  // Find the evidence bucket for this proposal's signal
  const bucket = evidence.find((b) => b.signalType === proposal.signalType);
  const sessionCount = bucket?.sessionCount ?? 0;
  const historyLen = bucket?.history.length ?? 0;

  // Combine description + rationale for text analysis
  const fullText = `${proposal.action.description} ${proposal.rationale}`.toLowerCase();

  // Rule (a): Theory reference with insufficient evidence
  const referencesTheory = THEORY_KEYWORDS.some((kw) => fullText.includes(kw));
  if (referencesTheory && historyLen < 3) {
    challenges.push({
      claim: `Proposal references theoretical framework`,
      challenge: `Only ${historyLen} data point(s) support this. Theoretical justification without sufficient empirical evidence is speculative.`,
      severity: historyLen === 0 ? "high" : "medium",
      simpleAlternative: "Wait for more evidence before acting on theoretical grounds.",
    });
  }

  // Rule (b): Wide target scope with narrow signal source
  const targetCount = proposal.action.targets?.length ?? 0;
  const distinctSignals = new Set(evidence.filter((b) => b.score > 0.1).map((b) => b.signalType)).size;
  if (targetCount > 3 && distinctSignals <= 1) {
    challenges.push({
      claim: `Proposal targets ${targetCount} files`,
      challenge: `Evidence comes from only ${distinctSignals} signal type(s). Wide changes based on narrow evidence increase risk.`,
      severity: "high",
      simpleAlternative: "Narrow the scope to the most affected files, or gather more diverse signals.",
    });
  }

  // Rule (c): Theory keywords without quantitative metrics
  const hasQuantitative = /\d+(\.\d+)?%|\d+(\.\d+)?\s*(score|rate|count|sessions|atoms)/i.test(fullText);
  if (referencesTheory && !hasQuantitative) {
    challenges.push({
      claim: `Proposal uses theoretical language`,
      challenge: `No quantitative metrics found in rationale. Theory without measurement is speculation.`,
      severity: "medium",
      simpleAlternative: "Include specific numeric thresholds or measured values.",
    });
  }

  // Compute over-speculation score (0-1)
  let overSpeculationScore = 0;
  if (challenges.length > 0) {
    const severityWeights: Record<string, number> = { low: 0.2, medium: 0.4, high: 0.7 };
    const totalWeight = challenges.reduce(
      (sum, c) => sum + (severityWeights[c.severity] ?? 0.3),
      0,
    );
    overSpeculationScore = Math.min(1, totalWeight / challenges.length * (challenges.length / 2));
  }

  // Maturity phase adjustment: mature systems get slight leniency
  if (context.maturityPhase === "mature" && overSpeculationScore > 0) {
    overSpeculationScore *= 0.85;
  }

  // Determine pass/fail
  const hasHighSeverity = challenges.some((c) => c.severity === "high");
  const passed = !hasHighSeverity && overSpeculationScore <= overSpeculationThreshold;

  // Build verdict
  let verdict: string;
  if (passed && challenges.length === 0) {
    verdict = "No challenges — evidence appears sufficient.";
  } else if (passed) {
    verdict = `${challenges.length} challenge(s) raised but within acceptable bounds (speculation=${overSpeculationScore.toFixed(2)}).`;
  } else if (hasHighSeverity) {
    verdict = `BLOCKED: High-severity challenge detected. ${challenges.length} challenge(s), speculation=${overSpeculationScore.toFixed(2)}.`;
  } else {
    verdict = `BLOCKED: Over-speculation score ${overSpeculationScore.toFixed(2)} exceeds threshold ${overSpeculationThreshold}.`;
  }

  return { passed, challenges, overSpeculationScore, verdict };
}

// ============================================================================
// Critique Proposal — Stub for Phase D (LLM-based)
// ============================================================================

/**
 * Constitutional AI 4-rubric proposal critique.
 *
 * Phase C: Returns a permissive stub result (always passes).
 * Phase D: Will integrate with Ollama for actual LLM-based scoring.
 */
export async function critiqueProposal(
  _proposal: IterationProposal,
): Promise<CritiqueResult> {
  // Stub: Phase D will implement LLM-based scoring
  return {
    passed: true,
    scores: {
      safety: 1.0,
      relevance: 1.0,
      reversibility: 1.0,
      evidenceStrength: 1.0,
    },
    compositeScore: 1.0,
    issues: [],
    suggestions: [],
    reasoning: "[stub] Phase D will implement LLM-based critique.",
  };
}
