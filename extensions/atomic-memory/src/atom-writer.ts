/**
 * Atom Writer — Serialize Atom objects back to markdown format.
 *
 * Produces the standard atom markdown format compatible with Atomic Memory V2.5.
 */

import type { Atom } from "./types.js";

/**
 * Serialize an Atom object into its markdown representation.
 */
export function serializeAtom(atom: Atom): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${atom.title}`);
  lines.push("");

  // Metadata block
  lines.push(`- Scope: ${atom.scope}`);
  lines.push(`- Confidence: ${atom.confidence}`);
  lines.push(`- Trigger: ${atom.triggers.join(", ")}`);
  lines.push(`- Last-used: ${atom.lastUsed}`);
  lines.push(`- Confirmations: ${atom.confirmations}`);
  lines.push(`- Type: semantic`);

  if (atom.tags.length > 0) {
    lines.push(`- Tags: ${atom.tags.join(", ")}`);
  }
  if (atom.related.length > 0) {
    lines.push(`- Related: ${atom.related.join(", ")}`);
  }
  if (atom.supersedes) {
    lines.push(`- Supersedes: ${atom.supersedes}`);
  }
  if (atom.sources.length > 0) {
    const sourcesStr = atom.sources
      .map((s) => (s.senderId ? `${s.channel}:${s.senderId}` : s.channel))
      .join(", ");
    lines.push(`- Sources: ${sourcesStr}`);
  }

  lines.push("");

  // Knowledge section
  lines.push("## 知識");
  lines.push("");
  if (atom.knowledge) {
    lines.push(atom.knowledge);
  }
  lines.push("");

  // Actions section
  lines.push("## 行動");
  lines.push("");
  if (atom.actions) {
    lines.push(atom.actions);
  }
  lines.push("");

  // Evolution log
  lines.push("## 演化日誌");
  lines.push("");
  for (const entry of atom.evolutionLog) {
    lines.push(`- ${entry}`);
  }
  if (atom.evolutionLog.length === 0) {
    lines.push(`- ${atom.lastUsed}: 建立`);
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate the MEMORY.md index content from a list of atoms.
 * Kept concise (≤30 lines) per system spec.
 */
export function serializeMemoryIndex(atoms: Atom[]): string {
  const lines: string[] = [];

  lines.push("# Atomic Memory Index");
  lines.push("");
  lines.push("| Category | ID | Confidence | Triggers |");
  lines.push("|----------|----|------------|----------|");

  // Sort by category, then by confirmations descending
  const sorted = [...atoms].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return b.confirmations - a.confirmations;
  });

  for (const atom of sorted) {
    const triggers = atom.triggers.slice(0, 3).join(", ");
    lines.push(`| ${atom.category} | ${atom.id} | ${atom.confidence} | ${triggers} |`);
  }

  lines.push("");
  return lines.join("\n");
}
