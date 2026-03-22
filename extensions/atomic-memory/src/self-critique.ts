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
  CritiqueScore,
  OutcomeResult,
  ReflectionText,
  ReflectionBuffer,
} from "./types.js";
import type { OllamaClient } from "./ollama-client.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createLogger } from "./logger.js";

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
// Critique Proposal — LLM-based (Phase D)
// ============================================================================

const critiqueLog = createLogger("self-critique");

/** Weights for composite score calculation. */
const CRITIQUE_WEIGHTS = {
  safety: 0.35,
  relevance: 0.25,
  reversibility: 0.20,
  evidenceStrength: 0.20,
} as const;

/** Default thresholds (overridden by config). */
const DEFAULT_PASS_THRESHOLD = 0.6;
const DEFAULT_SAFETY_VETO_THRESHOLD = 0.5;

export type CritiqueConfig = {
  enabled: boolean;
  passThreshold: number;
  safetyVetoThreshold: number;
};

const CRITIQUE_SYSTEM_PROMPT = `You are a safety reviewer for an AI memory system's self-iteration proposals.
Score this proposal on 4 rubrics (each 0.0-1.0):

1. **safety** — Could this proposal cause data loss, break the system, or violate user trust? (1.0 = completely safe, 0.0 = dangerous)
2. **relevance** — Does this proposal address a real, observed problem with sufficient evidence? (1.0 = clearly relevant, 0.0 = irrelevant)
3. **reversibility** — Can this change be easily undone if it causes problems? (1.0 = trivially reversible, 0.0 = irreversible)
4. **evidenceStrength** — Is the evidence strong enough to justify action? (1.0 = overwhelming evidence, 0.0 = no evidence)

Respond in JSON only:
{"safety":0.0,"relevance":0.0,"reversibility":0.0,"evidenceStrength":0.0,"issues":["..."],"suggestions":["..."],"reasoning":"..."}`;

/**
 * Constitutional AI 4-rubric proposal critique via Ollama LLM.
 *
 * Composite = 0.35×safety + 0.25×relevance + 0.20×reversibility + 0.20×evidenceStrength
 * Safety veto: safety < safetyVetoThreshold → composite capped at 0.4 → auto-fail
 * Fail-safe: Ollama 不可用 → block（not pass）
 */
export async function critiqueProposal(
  proposal: IterationProposal,
  ollamaClient?: OllamaClient,
  config?: Partial<CritiqueConfig>,
): Promise<CritiqueResult> {
  const passThreshold = config?.passThreshold ?? DEFAULT_PASS_THRESHOLD;
  const safetyVetoThreshold = config?.safetyVetoThreshold ?? DEFAULT_SAFETY_VETO_THRESHOLD;

  // If critique disabled, return permissive stub
  if (config?.enabled === false) {
    return {
      passed: true,
      scores: { safety: 1.0, relevance: 1.0, reversibility: 1.0, evidenceStrength: 1.0 },
      compositeScore: 1.0,
      issues: [],
      suggestions: [],
      reasoning: "[critique disabled] Permissive pass.",
    };
  }

  // Fail-safe: no client → block
  if (!ollamaClient) {
    critiqueLog.warn("critiqueProposal: no Ollama client — blocking");
    return buildBlockResult("Ollama client not available — fail-safe block.");
  }

  // Fail-safe: Ollama not reachable → block
  const available = await ollamaClient.isAvailable();
  if (!available) {
    critiqueLog.warn("critiqueProposal: Ollama not reachable — blocking");
    return buildBlockResult("Ollama not reachable — fail-safe block.");
  }

  // Build user prompt
  const userPrompt = [
    `## Proposal: ${proposal.summary}`,
    `Signal: ${proposal.signalType}`,
    `Action: ${proposal.action.type} — ${proposal.action.description}`,
    proposal.action.targets?.length
      ? `Targets: ${proposal.action.targets.join(", ")}`
      : "",
    `Rationale: ${proposal.rationale}`,
    `Decision Level: ${proposal.decisionLevel}`,
  ].filter(Boolean).join("\n");

  // Call Ollama
  let rawResponse: string;
  try {
    rawResponse = await ollamaClient.chat(
      CRITIQUE_SYSTEM_PROMPT,
      userPrompt,
      {
        temperature: 0.1,
        maxTokens: 800,
        timeoutMs: 30_000,
        jsonMode: true,
      },
    );
  } catch (err) {
    critiqueLog.warn(`critiqueProposal: Ollama call failed — ${err instanceof Error ? err.message : String(err)}`);
    return buildBlockResult(`Ollama call failed: ${err instanceof Error ? err.message : String(err)} — fail-safe block.`);
  }

  // Parse response
  let parsed: {
    safety?: number;
    relevance?: number;
    reversibility?: number;
    evidenceStrength?: number;
    issues?: string[];
    suggestions?: string[];
    reasoning?: string;
  };

  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    critiqueLog.warn(`critiqueProposal: JSON parse failed — blocking. Raw: ${rawResponse.slice(0, 200)}`);
    return buildBlockResult("LLM response not valid JSON — fail-safe block.");
  }

  // Extract scores (clamp 0-1)
  const scores: CritiqueScore = {
    safety: clamp01(parsed.safety),
    relevance: clamp01(parsed.relevance),
    reversibility: clamp01(parsed.reversibility),
    evidenceStrength: clamp01(parsed.evidenceStrength),
  };

  // Composite calculation
  let compositeScore =
    CRITIQUE_WEIGHTS.safety * scores.safety +
    CRITIQUE_WEIGHTS.relevance * scores.relevance +
    CRITIQUE_WEIGHTS.reversibility * scores.reversibility +
    CRITIQUE_WEIGHTS.evidenceStrength * scores.evidenceStrength;

  const issues = Array.isArray(parsed.issues) ? parsed.issues.filter((s): s is string => typeof s === "string") : [];
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((s): s is string => typeof s === "string") : [];
  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";

  // Safety veto
  let safetyVetoed = false;
  if (scores.safety < safetyVetoThreshold) {
    compositeScore = Math.min(compositeScore, 0.4);
    safetyVetoed = true;
    issues.unshift(`Safety veto: score ${scores.safety.toFixed(2)} < threshold ${safetyVetoThreshold}`);
  }

  const passed = compositeScore >= passThreshold && !safetyVetoed;

  critiqueLog.info(
    `critiqueProposal: ${proposal.id.slice(0, 8)} → composite=${compositeScore.toFixed(2)} ` +
    `(s=${scores.safety.toFixed(2)} r=${scores.relevance.toFixed(2)} rev=${scores.reversibility.toFixed(2)} e=${scores.evidenceStrength.toFixed(2)}) ` +
    `→ ${passed ? "PASS" : "FAIL"}${safetyVetoed ? " [safety veto]" : ""}`,
  );

  return {
    passed,
    scores,
    compositeScore,
    issues,
    suggestions,
    reasoning,
  };
}

function clamp01(value: unknown): number {
  if (typeof value !== "number" || isNaN(value)) return 0.5; // unknown → neutral
  return Math.max(0, Math.min(1, value));
}

function buildBlockResult(reasoning: string): CritiqueResult {
  return {
    passed: false,
    scores: { safety: 0, relevance: 0, reversibility: 0, evidenceStrength: 0 },
    compositeScore: 0,
    issues: [reasoning],
    suggestions: [],
    reasoning,
  };
}

// ============================================================================
// Reflexion Buffer (Phase E — Spec M5)
// ============================================================================

const ITERATION_DIR = "_iteration";
const REFLECTION_FILE = "reflection-buffer.json";
const DEFAULT_MAX_ENTRIES = 10;
const DEFAULT_MAX_CONTEXT_TOKENS = 200;
const CHARS_PER_TOKEN = 3; // CJK average

/**
 * Deterministic reflection text generation from outcome + proposal.
 * No LLM required.
 */
export function generateReflectionText(
  outcome: OutcomeResult,
  proposal: IterationProposal,
): ReflectionText {
  const whatWorked: string[] = [];
  const whatFailed: string[] = [];
  const whatToTryNext: string[] = [];

  if (outcome.verdict === "improved") {
    whatWorked.push(`Action "${proposal.action.type}" improved target metrics.`);
    for (const d of outcome.drivers) {
      if (d.changePercent > 0) {
        whatWorked.push(`${d.metric}: ${d.baselineValue.toFixed(2)} → ${d.currentValue.toFixed(2)} (+${d.changePercent.toFixed(1)}%)`);
      }
    }
    whatToTryNext.push("Continue monitoring for sustained improvement.");
  } else if (outcome.verdict === "degraded") {
    whatFailed.push(`Action "${proposal.action.type}" degraded target metrics.`);
    for (const d of outcome.drivers) {
      if (d.changePercent < 0) {
        whatFailed.push(`${d.metric}: ${d.baselineValue.toFixed(2)} → ${d.currentValue.toFixed(2)} (${d.changePercent.toFixed(1)}%)`);
      }
    }
    whatToTryNext.push("Consider reverting or adjusting the action parameters.");
    whatToTryNext.push("Gather more evidence before retrying similar actions.");
  } else {
    // neutral
    whatWorked.push("No negative impact detected.");
    whatFailed.push("No measurable improvement either.");
    whatToTryNext.push("May need more sessions to observe effect, or try a different approach.");
  }

  const text = [
    `Proposal: ${proposal.summary}`,
    `Action: ${proposal.action.type} — ${proposal.action.description}`,
    `Outcome: ${outcome.verdict} (after ${outcome.sessionsElapsed} sessions)`,
    whatWorked.length > 0 ? `Worked: ${whatWorked.join("; ")}` : "",
    whatFailed.length > 0 ? `Failed: ${whatFailed.join("; ")}` : "",
    whatToTryNext.length > 0 ? `Next: ${whatToTryNext.join("; ")}` : "",
  ].filter(Boolean).join("\n");

  return {
    text,
    whatWorked,
    whatFailed,
    whatToTryNext,
    timestamp: new Date().toISOString(),
    proposalDescription: proposal.action.description,
    outcomeSuccess: outcome.verdict === "improved",
  };
}

/**
 * Sliding window buffer management — add reflection, evict oldest if over limit.
 */
export function addReflection(buffer: ReflectionBuffer, reflection: ReflectionText): ReflectionBuffer {
  const entries = [...buffer.entries, reflection];
  // Evict oldest entries if over limit
  while (entries.length > buffer.maxEntries) {
    entries.shift();
  }
  return { entries, maxEntries: buffer.maxEntries };
}

/**
 * Get reflection context for injection (failure-prioritized, token-budgeted).
 */
export function getReflectionContext(buffer: ReflectionBuffer, maxTokenBudget?: number): string {
  if (buffer.entries.length === 0) return "";

  const budget = maxTokenBudget ?? DEFAULT_MAX_CONTEXT_TOKENS;
  const maxChars = budget * CHARS_PER_TOKEN;

  // Sort: failures first (most recent first within each group)
  const sorted = [...buffer.entries].sort((a, b) => {
    if (a.outcomeSuccess !== b.outcomeSuccess) {
      return a.outcomeSuccess ? 1 : -1; // failures first
    }
    return b.timestamp.localeCompare(a.timestamp); // recent first
  });

  const lines: string[] = ["[Reflexion Context]"];
  let charCount = lines[0].length;

  for (const entry of sorted) {
    const line = entry.outcomeSuccess
      ? `✓ ${entry.proposalDescription}: ${entry.whatWorked[0] ?? "improved"}`
      : `✗ ${entry.proposalDescription}: ${entry.whatFailed[0] ?? "degraded"} → ${entry.whatToTryNext[0] ?? "reconsider"}`;

    if (charCount + line.length + 1 > maxChars) break;
    lines.push(line);
    charCount += line.length + 1;
  }

  return lines.length > 1 ? lines.join("\n") : "";
}

// ============================================================================
// Reflexion Persistence
// ============================================================================

export async function loadReflectionBuffer(atomStorePath: string, maxEntries?: number): Promise<ReflectionBuffer> {
  const filePath = join(atomStorePath, ITERATION_DIR, REFLECTION_FILE);
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as ReflectionBuffer;
    return {
      entries: Array.isArray(data.entries) ? data.entries : [],
      maxEntries: data.maxEntries ?? maxEntries ?? DEFAULT_MAX_ENTRIES,
    };
  } catch {
    return { entries: [], maxEntries: maxEntries ?? DEFAULT_MAX_ENTRIES };
  }
}

export async function saveReflectionBuffer(atomStorePath: string, buffer: ReflectionBuffer): Promise<void> {
  const dir = join(atomStorePath, ITERATION_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, REFLECTION_FILE), JSON.stringify(buffer, null, 2), "utf-8");
}

/**
 * Format reflection buffer summary for /iterate status display.
 */
export function formatReflectionSummary(buffer: ReflectionBuffer): string {
  if (buffer.entries.length === 0) return "  Empty (no reflections yet).";
  const successes = buffer.entries.filter((e) => e.outcomeSuccess).length;
  const failures = buffer.entries.length - successes;
  const lines = [
    `  Entries: ${buffer.entries.length}/${buffer.maxEntries} (${successes} success, ${failures} failure)`,
  ];
  // Show latest 3
  const recent = buffer.entries.slice(-3).reverse();
  for (const entry of recent) {
    const icon = entry.outcomeSuccess ? "✓" : "✗";
    lines.push(`  ${icon} ${entry.proposalDescription.slice(0, 60)} (${entry.timestamp.slice(0, 10)})`);
  }
  return lines.join("\n");
}
