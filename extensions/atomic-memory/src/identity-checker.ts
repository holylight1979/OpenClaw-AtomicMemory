/**
 * OETAV Phase E — Identity Checker (Spec M3)
 *
 * Tracks identity-defining atoms/rules and detects drift from baseline.
 * Persists baseline to {atomStorePath}/_iteration/identity-baseline.json.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  AtomSnapshot,
  RuleSnapshot,
  IdentitySnapshot,
  DriftSeverity,
  DriftItem,
  DriftReport,
  Confidence,
} from "./types.js";

// ============================================================================
// Constants
// ============================================================================

const ITERATION_DIR = "_iteration";
const BASELINE_FILE = "identity-baseline.json";

// ============================================================================
// CoreAtomRegistry
// ============================================================================

/**
 * Registry of identity-defining atoms/rules.
 *
 * Default essentials: IDENTITY.md atoms, permission rules, decision gate config.
 * Default constitutional: wisdom classifier rules, OETAV thresholds, evolve-guard paths.
 */
export class CoreAtomRegistry {
  essentialAtoms: Set<string>;
  constitutionalRules: Set<string>;
  constitutionalThresholds: Set<string>;

  constructor(essentialAtomRefs: string[] = []) {
    // Default essentials — identity-defining atoms that must not drift silently
    this.essentialAtoms = new Set([
      "topic/IDENTITY",
      "topic/permission-rules",
      "topic/decision-gate",
      ...essentialAtomRefs,
    ]);

    // Default constitutional — important but not identity-breaking
    this.constitutionalRules = new Set([
      "wisdom-classifier",
      "evolve-guard",
      "sync-workflow",
      "memory-system",
    ]);

    this.constitutionalThresholds = new Set([
      "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9",
    ]);
  }

  markEssential(atomRef: string): void {
    this.essentialAtoms.add(atomRef);
  }

  requiresIdentityReview(ref: string): "essential" | "constitutional" | "accidental" {
    if (this.essentialAtoms.has(ref)) return "essential";
    if (this.constitutionalRules.has(ref)) return "constitutional";
    if (this.constitutionalThresholds.has(ref)) return "constitutional";
    return "accidental";
  }
}

// ============================================================================
// Persistence
// ============================================================================

export async function loadIdentityBaseline(atomStorePath: string): Promise<IdentitySnapshot | null> {
  const filePath = join(atomStorePath, ITERATION_DIR, BASELINE_FILE);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as IdentitySnapshot;
  } catch {
    return null;
  }
}

export async function saveIdentityBaseline(atomStorePath: string, baseline: IdentitySnapshot): Promise<void> {
  const dir = join(atomStorePath, ITERATION_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, BASELINE_FILE), JSON.stringify(baseline, null, 2), "utf-8");
}

// ============================================================================
// Baseline Creation
// ============================================================================

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Build current atom snapshots by scanning the atom store directory.
 * Each .md file under category dirs is treated as an atom.
 */
async function scanAtomSnapshots(atomStorePath: string): Promise<AtomSnapshot[]> {
  const snapshots: AtomSnapshot[] = [];
  const categories = ["person", "topic", "event", "place", "thing"];

  for (const cat of categories) {
    const catDir = join(atomStorePath, cat);
    let files: string[];
    try {
      files = (await readdir(catDir)).filter((f) => f.endsWith(".md"));
    } catch {
      continue; // category dir may not exist
    }

    for (const file of files) {
      try {
        const content = await readFile(join(catDir, file), "utf-8");
        const id = file.replace(/\.md$/, "");
        const ref = `${cat}/${id}`;

        // Parse minimal metadata from frontmatter-like content
        const confidenceMatch = content.match(/confidence:\s*(\[[^\]]+\])/i);
        const confidence = (confidenceMatch?.[1] as Confidence) ?? "[臨]";
        const triggersMatch = content.match(/triggers:\s*(.+)/i);
        const triggers = triggersMatch
          ? triggersMatch[1].split(",").map((t) => t.trim()).filter(Boolean)
          : [];

        snapshots.push({
          ref,
          contentHash: sha256(content),
          confidence,
          triggers,
          lastModified: new Date().toISOString(),
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  return snapshots;
}

/**
 * Scan rules from .claude/rules/*.md.
 */
async function scanRuleSnapshots(rulesDir: string): Promise<RuleSnapshot[]> {
  const snapshots: RuleSnapshot[] = [];
  try {
    const files = (await readdir(rulesDir)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      try {
        const content = await readFile(join(rulesDir, file), "utf-8");
        snapshots.push({
          name: file.replace(/\.md$/, ""),
          contentHash: sha256(content),
          source: join(rulesDir, file),
        });
      } catch {
        // skip
      }
    }
  } catch {
    // rules dir may not exist
  }
  return snapshots;
}

/**
 * Build baseline snapshot (called once when system reaches "stable").
 */
export async function createIdentityBaseline(
  atomStorePath: string,
  registry: CoreAtomRegistry,
  thresholds?: Record<string, number>,
): Promise<IdentitySnapshot> {
  const coreAtoms = await scanAtomSnapshots(atomStorePath);
  const rulesDir = join(atomStorePath, "..", "..", "..", ".claude", "rules");
  const rules = await scanRuleSnapshots(rulesDir);

  const snapshot: IdentitySnapshot = {
    timestamp: new Date().toISOString(),
    coreAtoms,
    rules,
    thresholds: thresholds ?? {},
    fingerprint: "", // computed below
  };

  // Fingerprint = hash of entire snapshot (minus fingerprint field)
  snapshot.fingerprint = sha256(JSON.stringify(snapshot));

  await saveIdentityBaseline(atomStorePath, snapshot);
  return snapshot;
}

// ============================================================================
// Drift Detection
// ============================================================================

/**
 * Compare current atoms vs baseline, generate drift report.
 *
 * Severity:
 *   essential drifts > 0 → critical
 *   constitutional > 2 or coreChangeRatio > 0.3 → significant
 *   constitutional > 0 → minor
 *   else → none
 */
export function checkIdentityDrift(
  currentAtoms: AtomSnapshot[],
  baseline: IdentitySnapshot,
  registry: CoreAtomRegistry,
  currentRules?: RuleSnapshot[],
  currentThresholds?: Record<string, number>,
): DriftReport {
  const essentialDrifts: DriftItem[] = [];
  const constitutionalDrifts: DriftItem[] = [];
  const accidentalDrifts: DriftItem[] = [];

  const baselineAtomMap = new Map(baseline.coreAtoms.map((a) => [a.ref, a]));
  const currentAtomMap = new Map(currentAtoms.map((a) => [a.ref, a]));

  // Check modified + removed atoms
  for (const [ref, baseAtom] of baselineAtomMap) {
    const currentAtom = currentAtomMap.get(ref);
    const propertyType = registry.requiresIdentityReview(ref);

    if (!currentAtom) {
      const item: DriftItem = {
        type: "atom-removed",
        ref,
        propertyType,
        detail: `Atom ${ref} was present in baseline but is now missing.`,
      };
      pushToBucket(item, essentialDrifts, constitutionalDrifts, accidentalDrifts);
    } else if (currentAtom.contentHash !== baseAtom.contentHash) {
      const item: DriftItem = {
        type: "atom-modified",
        ref,
        propertyType,
        detail: `Atom ${ref} content changed since baseline.`,
      };
      pushToBucket(item, essentialDrifts, constitutionalDrifts, accidentalDrifts);
    }
  }

  // Check added atoms
  for (const [ref] of currentAtomMap) {
    if (!baselineAtomMap.has(ref)) {
      const propertyType = registry.requiresIdentityReview(ref);
      const item: DriftItem = {
        type: "atom-added",
        ref,
        propertyType,
        detail: `Atom ${ref} is new (not in baseline).`,
      };
      pushToBucket(item, essentialDrifts, constitutionalDrifts, accidentalDrifts);
    }
  }

  // Check rules drift
  if (currentRules) {
    const baselineRuleMap = new Map(baseline.rules.map((r) => [r.name, r]));
    const currentRuleMap = new Map(currentRules.map((r) => [r.name, r]));

    for (const [name, baseRule] of baselineRuleMap) {
      const currentRule = currentRuleMap.get(name);
      const propertyType = registry.requiresIdentityReview(name);
      if (!currentRule) {
        const item: DriftItem = { type: "rule-removed", ref: name, propertyType, detail: `Rule ${name} removed.` };
        pushToBucket(item, essentialDrifts, constitutionalDrifts, accidentalDrifts);
      } else if (currentRule.contentHash !== baseRule.contentHash) {
        const item: DriftItem = { type: "rule-modified", ref: name, propertyType, detail: `Rule ${name} modified.` };
        pushToBucket(item, essentialDrifts, constitutionalDrifts, accidentalDrifts);
      }
    }

    for (const [name] of currentRuleMap) {
      if (!baselineRuleMap.has(name)) {
        const propertyType = registry.requiresIdentityReview(name);
        const item: DriftItem = { type: "rule-modified", ref: name, propertyType, detail: `Rule ${name} is new.` };
        pushToBucket(item, essentialDrifts, constitutionalDrifts, accidentalDrifts);
      }
    }
  }

  // Check threshold drift
  if (currentThresholds) {
    for (const [key, baseVal] of Object.entries(baseline.thresholds)) {
      if (currentThresholds[key] !== undefined && currentThresholds[key] !== baseVal) {
        const propertyType = registry.requiresIdentityReview(key);
        const item: DriftItem = {
          type: "threshold-changed",
          ref: key,
          propertyType,
          detail: `Threshold ${key}: ${baseVal} → ${currentThresholds[key]}`,
        };
        pushToBucket(item, essentialDrifts, constitutionalDrifts, accidentalDrifts);
      }
    }
  }

  // Compute core change ratio
  const totalBaseline = baseline.coreAtoms.length + baseline.rules.length;
  const totalDrifts = essentialDrifts.length + constitutionalDrifts.length;
  const coreChangeRatio = totalBaseline > 0 ? totalDrifts / totalBaseline : 0;

  // Severity determination
  let severity: DriftSeverity;
  if (essentialDrifts.length > 0) {
    severity = "critical";
  } else if (constitutionalDrifts.length > 2 || coreChangeRatio > 0.3) {
    severity = "significant";
  } else if (constitutionalDrifts.length > 0) {
    severity = "minor";
  } else {
    severity = "none";
  }

  // Build evolution narrative
  const parts: string[] = [];
  if (essentialDrifts.length > 0) parts.push(`${essentialDrifts.length} essential drift(s)`);
  if (constitutionalDrifts.length > 0) parts.push(`${constitutionalDrifts.length} constitutional drift(s)`);
  if (accidentalDrifts.length > 0) parts.push(`${accidentalDrifts.length} accidental drift(s)`);
  const evolutionNarrative = parts.length > 0
    ? `Identity drift detected: ${parts.join(", ")}. Core change ratio: ${(coreChangeRatio * 100).toFixed(1)}%.`
    : "No identity drift detected.";

  return {
    severity,
    essentialDrifts,
    constitutionalDrifts,
    accidentalDrifts,
    coreChangeRatio,
    evolutionNarrative,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function pushToBucket(
  item: DriftItem,
  essential: DriftItem[],
  constitutional: DriftItem[],
  accidental: DriftItem[],
): void {
  switch (item.propertyType) {
    case "essential": essential.push(item); break;
    case "constitutional": constitutional.push(item); break;
    case "accidental": accidental.push(item); break;
  }
}

/**
 * Format identity drift report for /iterate status display.
 */
export function formatIdentityDriftSummary(report: DriftReport | null): string {
  if (!report) return "  No baseline established yet.";
  if (report.severity === "none") return "  No drift detected.";
  const lines = [
    `  Severity: ${report.severity.toUpperCase()}`,
    `  Core change ratio: ${(report.coreChangeRatio * 100).toFixed(1)}%`,
  ];
  if (report.essentialDrifts.length > 0) {
    lines.push(`  Essential: ${report.essentialDrifts.map((d) => d.ref).join(", ")}`);
  }
  if (report.constitutionalDrifts.length > 0) {
    lines.push(`  Constitutional: ${report.constitutionalDrifts.map((d) => d.ref).join(", ")}`);
  }
  lines.push(`  ${report.evolutionNarrative}`);
  return lines.join("\n");
}
