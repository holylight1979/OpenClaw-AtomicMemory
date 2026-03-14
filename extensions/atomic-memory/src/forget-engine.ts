/**
 * Forget Intent Detection & Contradiction Detection
 *
 * Extracted from index.ts for modularity.
 * - detectForgetIntent: identifies user requests to forget/delete memories
 * - detectContradiction: checks if a new fact negates an existing atom
 */

// ============================================================================
// Forget intent detection (方案 A: hook-level auto-delete)
// ============================================================================

const FORGET_PATTERNS = [
  /忘(記|掉|了)|刪(除|掉)|移除|不要記|別記|去掉/,
  /forget|delete|remove|erase|clear/i,
];

const FORGET_CLEANUP_PATTERNS = [
  /^(請|幫我|可以|麻煩|你)?/,
  /忘(記|掉|了)|刪(除|掉)|移除|不要記|別記|去掉/g,
  /forget|delete|remove|erase|clear/gi,
  /^(這個|那個|有關|關於|about|the|my|我的)\s*/i,
  /(的事|的記憶|的東西|memory|memories|fact|facts)\s*$/i,
  /[。，！？.!?,]/g,
];

/**
 * Detect if a user message is asking to forget/delete a memory.
 * Returns the target keyword to search for deletion.
 */
export function detectForgetIntent(text: string): { isForget: boolean; target: string } {
  // Skip confirmation-style responses (user confirming a previous forget action)
  if (/^(確認|好|對|是|ok|yes|sure|confirm|y|刪|刪吧|刪掉|確認刪除)\s*[。！?.!]?\s*$/i.test(text.trim())) {
    return { isForget: false, target: "" };
  }

  const matched = FORGET_PATTERNS.some((p) => p.test(text));
  if (!matched) return { isForget: false, target: "" };

  // Extract the target: strip forget keywords and common particles
  let target = text;
  for (const pattern of FORGET_CLEANUP_PATTERNS) {
    target = target.replace(pattern, "");
  }
  target = target.trim();

  // Need at least 2 chars to be a meaningful target
  if (target.length >= 2) {
    return { isForget: true, target };
  }
  return { isForget: false, target: "" };
}

// ============================================================================
// Contradiction detection (方案 B: capture-level auto-supersede)
// ============================================================================

const NEGATION_KEYWORDS_ZH = [
  // Compound negations first (longer matches removed before shorter ones)
  "沒有", "不是", "不養", "沒養", "不喜歡", "沒去", "不會", "不要",
  "並非", "其實不", "不再", "已經不", "沒在", "從沒", "從未",
  // Single-char negation particles (catch 不+verb / 沒+verb patterns)
  "不", "沒",
];
const NEGATION_KEYWORDS_EN = [
  "doesn't", "don't", "isn't", "not", "never", "no longer",
  "didn't", "wasn't", "aren't", "haven't", "hasn't",
];

/**
 * Check if a new fact contradicts an existing atom's knowledge.
 * Returns true if the new fact appears to negate the existing knowledge.
 *
 * Strategy: if the new fact contains negation keywords AND shares
 * subject keywords with the existing atom, it's likely a contradiction.
 */
export function detectContradiction(newFact: string, existingKnowledge: string): boolean {
  const hasNegation =
    NEGATION_KEYWORDS_ZH.some((kw) => newFact.includes(kw)) ||
    NEGATION_KEYWORDS_EN.some((kw) => newFact.toLowerCase().includes(kw));

  if (!hasNegation) return false;

  // Extract content words from both texts
  // CJK: use bigram sliding window (Chinese has no spaces, so greedy match
  // produces one giant token that never overlaps)
  const extractWords = (text: string): Set<string> => {
    const words = new Set<string>();
    // CJK bigrams (2-char sliding window)
    const cjkOnly = text.replace(/[^\u4e00-\u9fff]/g, "");
    for (let i = 0; i <= cjkOnly.length - 2; i++) {
      words.add(cjkOnly.slice(i, i + 2));
    }
    // English words (3+ chars, lowercased)
    const en = text.match(/[a-zA-Z]{3,}/g);
    if (en) for (const w of en) words.add(w.toLowerCase());
    return words;
  };

  // Remove negation keywords from the new fact before extracting words
  let cleanedNewFact = newFact;
  for (const kw of [...NEGATION_KEYWORDS_ZH, ...NEGATION_KEYWORDS_EN]) {
    cleanedNewFact = cleanedNewFact.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi"), "");
  }

  const newWords = extractWords(cleanedNewFact);
  const existingWords = extractWords(existingKnowledge);

  // Count overlapping content words
  let overlap = 0;
  for (const w of newWords) {
    if (existingWords.has(w)) overlap++;
  }

  // At least 1 overlapping content word = likely contradiction
  return overlap >= 1;
}
