/**
 * Atom Parser — Markdown → Atom structured object.
 *
 * Parses the standard atom markdown format used by Atomic Memory V2.5.
 * Ported from indexer.py's parse_and_chunk() logic.
 */

import type { Atom, AtomCategory, AtomChunk, AtomSource, Confidence } from "./types.js";

// ============================================================================
// Metadata regex patterns (ported from indexer.py META_RE)
// ============================================================================

const META_PATTERNS: Record<string, RegExp> = {
  confidence: /^-\s*Confidence:\s*(\[固\]|\[觀\]|\[臨\])/m,
  trigger: /^-\s*Trigger:\s*(.+)/m,
  lastUsed: /^-\s*Last-used:\s*(\d{4}-\d{2}-\d{2})/m,
  confirmations: /^-\s*Confirmations:\s*(\d+)/m,
  tags: /^-\s*Tags?:\s*(.+)/m,
  related: /^-\s*Related:\s*(.+)/m,
  supersedes: /^-\s*Supersedes:\s*(.+)/m,
  scope: /^-\s*Scope:\s*(.+)/m,
  type: /^-\s*Type:\s*(.+)/m,
};

/**
 * Split a comma-separated metadata value into trimmed parts.
 */
function splitCsv(value: string): string[] {
  return value
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extract the title from the first H1 heading.
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "";
}

/**
 * Parse sources from a "Sources:" metadata line or knowledge content.
 * Format: "whatsapp:sender1, telegram:sender2"
 */
function parseSources(content: string): AtomSource[] {
  const match = content.match(/^-\s*Sources?:\s*(.+)/m);
  if (!match) return [];

  return splitCsv(match[1]).map((s) => {
    const [channel, senderId] = s.split(":");
    return { channel: channel.trim(), senderId: senderId?.trim() };
  });
}

// ============================================================================
// Section extraction
// ============================================================================

/**
 * Extract content between two H2 headings.
 * Returns the content under the specified heading, excluding the heading itself.
 */
function extractSection(content: string, heading: string): string {
  // Match the heading and capture until the next H2 or end of file
  const pattern = new RegExp(
    `^##\\s+${escapeRegex(heading)}\\s*$\\n([\\s\\S]*?)(?=^##\\s|$(?!\\n))`,
    "m",
  );
  const match = content.match(pattern);
  return match ? match[1].trim() : "";
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Main parser
// ============================================================================

/**
 * Parse a markdown atom file into a structured Atom object.
 *
 * @param content - Raw markdown content of the .md file
 * @param id - Atom ID (filename without extension)
 * @param category - Atom category derived from parent directory
 */
export function parseAtom(content: string, id: string, category: AtomCategory): Atom {
  const title = extractTitle(content) || id;

  // Extract metadata
  const confidenceMatch = content.match(META_PATTERNS.confidence);
  const confidence: Confidence = (confidenceMatch?.[1] as Confidence) || "[臨]";

  const triggerMatch = content.match(META_PATTERNS.trigger);
  const triggers = triggerMatch ? splitCsv(triggerMatch[1]) : [title];

  const lastUsedMatch = content.match(META_PATTERNS.lastUsed);
  const lastUsed = lastUsedMatch?.[1] || new Date().toISOString().slice(0, 10);

  const confirmationsMatch = content.match(META_PATTERNS.confirmations);
  const confirmations = confirmationsMatch ? parseInt(confirmationsMatch[1], 10) : 0;

  const tagsMatch = content.match(META_PATTERNS.tags);
  const tags = tagsMatch ? splitCsv(tagsMatch[1]) : [];

  const relatedMatch = content.match(META_PATTERNS.related);
  const related = relatedMatch ? splitCsv(relatedMatch[1]) : [];

  const supersedesMatch = content.match(META_PATTERNS.supersedes);
  const supersedes = supersedesMatch?.[1]?.trim();

  const sources = parseSources(content);

  // Extract sections
  const knowledge = extractSection(content, "知識");
  const actions = extractSection(content, "行動");

  // Evolution log: each line under ## 演化日誌
  const evolutionSection = extractSection(content, "演化日誌");
  const evolutionLog = evolutionSection
    ? evolutionSection
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("-"))
        .map((l) => l.replace(/^-\s*/, ""))
    : [];

  return {
    id,
    title,
    category,
    confidence,
    triggers,
    lastUsed,
    confirmations,
    tags,
    related,
    supersedes: supersedes || undefined,
    sources,
    knowledge,
    actions,
    evolutionLog,
  };
}

// ============================================================================
// Chunking (for vector indexing)
// ============================================================================

/**
 * Split an atom's knowledge section into chunks for vector indexing.
 * Each top-level bullet point becomes a chunk. Sub-bullets are merged into parent.
 * Ported from indexer.py's chunking strategy.
 */
export function chunkAtom(atom: Atom): AtomChunk[] {
  const chunks: AtomChunk[] = [];
  if (!atom.knowledge) return chunks;

  const lines = atom.knowledge.split("\n");
  let currentSection = "知識";
  let currentChunk = "";
  let chunkIndex = 0;

  const flushChunk = () => {
    const text = currentChunk.trim();
    if (text.length >= 5) {
      chunks.push({
        chunkId: `${atom.category}/${atom.id}#chunk-${chunkIndex}`,
        text,
        section: `## 知識 > ${currentSection}`,
        atomName: `${atom.category}/${atom.id}`,
        category: atom.category,
        confidence: atom.confidence,
        lastUsed: atom.lastUsed,
        confirmations: atom.confirmations,
        triggers: atom.triggers.join(", "),
        tags: atom.tags.join(", "),
      });
      chunkIndex++;
    }
    currentChunk = "";
  };

  for (const line of lines) {
    // Track H3 sub-sections
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      flushChunk();
      currentSection = h3Match[1].trim();
      continue;
    }

    // Top-level bullet starts a new chunk
    if (/^-\s/.test(line)) {
      flushChunk();
      currentChunk = line.replace(/^-\s*/, "").trim();
      continue;
    }

    // Indented sub-bullet or continuation — merge into current chunk
    if (/^\s+-\s/.test(line) || /^\s+/.test(line)) {
      if (currentChunk) {
        currentChunk += " " + line.trim().replace(/^-\s*/, "");
      }
      continue;
    }

    // Non-bullet text — treat as a standalone chunk
    if (line.trim()) {
      flushChunk();
      currentChunk = line.trim();
    }
  }

  // Flush remaining
  flushChunk();

  // If no chunks were produced from bullets, chunk the entire knowledge as one
  if (chunks.length === 0 && atom.knowledge.trim().length >= 5) {
    chunks.push({
      chunkId: `${atom.category}/${atom.id}#chunk-0`,
      text: atom.knowledge.trim(),
      section: "## 知識",
      atomName: `${atom.category}/${atom.id}`,
      category: atom.category,
      confidence: atom.confidence,
      lastUsed: atom.lastUsed,
      confirmations: atom.confirmations,
      triggers: atom.triggers.join(", "),
      tags: atom.tags.join(", "),
    });
  }

  return chunks;
}
