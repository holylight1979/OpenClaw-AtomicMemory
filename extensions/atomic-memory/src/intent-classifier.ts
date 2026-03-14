/**
 * Intent Classifier — Rule-based intent scoring for user prompts.
 *
 * Zero LLM overhead (~1ms). Returns intent type, confidence, and
 * recall boosts keyed by atom category.
 */

import type { IntentType } from "./types.js";

// ============================================================================
// Keyword patterns per intent (Chinese + English)
// ============================================================================

const INTENT_PATTERNS: Record<IntentType, string[]> = {
  "memory-query": [
    "記得", "忘記", "知道", "之前", "上次", "有沒有記", "記憶",
    "remember", "forget", "recall", "memory", "知不知道",
    "你還記得", "我說過", "我跟你說過", "我想起", "告訴我", "提醒我",
  ],
  "info-request": [
    "什麼", "為什麼", "怎麼", "如何", "哪裡", "哪個", "幾", "多少",
    "what", "why", "how", "where", "which", "when",
    "是什麼", "怎麼做", "怎麼辦", "為何",
  ],
  task: [
    "幫我", "請", "執行", "建立", "產生", "寫", "改",
    "help", "please", "create", "make", "write", "fix",
    "幫忙", "可以幫", "能不能", "我要", "我想要", "能幫",
  ],
  social: [
    "早安", "晚安", "你好嗎", "謝謝", "感謝", "辛苦", "加油",
    "good morning", "good night", "thank", "thanks",
    "不客氣", "沒問題",
  ],
  greeting: [
    "嗨", "哈囉", "你好", "hi", "hello", "hey", "yo",
    "安安", "欸",
  ],
  command: [
    "設定", "開啟", "關閉", "切換", "啟用", "停用", "重啟",
    "set", "enable", "disable", "toggle", "restart", "config",
    "打開", "關掉",
  ],
  general: [],
};

// ============================================================================
// Recall boosts per intent — different intents favor different atom types
// ============================================================================

const INTENT_BOOSTS: Record<IntentType, Record<string, number>> = {
  "memory-query": { person: 0.15, topic: 0.10, event: 0.10 },
  "info-request": { topic: 0.10, thing: 0.10 },
  task: { topic: 0.05, thing: 0.05 },
  social: { person: 0.10 },
  greeting: { person: 0.10 },
  command: {},
  general: {},
};

// ============================================================================
// Classifier
// ============================================================================

export type IntentResult = {
  intent: IntentType;
  confidence: number;
  boosts: Record<string, number>;
};

/**
 * Classify user intent from prompt text.
 *
 * Returns the best-matching intent, a confidence score (0-1),
 * and category boosts for recall weighting.
 */
export function classifyIntent(prompt: string): IntentResult {
  const lower = prompt.toLowerCase();
  const scores: Record<string, number> = {};
  let maxScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
    if (intent === "general") continue;
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score++;
      }
    }
    scores[intent] = score;
    if (score > maxScore) maxScore = score;
  }

  if (maxScore === 0) {
    return { intent: "general", confidence: 0.3, boosts: {} };
  }

  // Pick the intent with highest keyword hits
  let bestIntent: IntentType = "general";
  let bestScore = 0;
  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as IntentType;
    }
  }

  // Confidence: ratio of matched keywords vs total keywords for that intent
  const totalKeywords = INTENT_PATTERNS[bestIntent].length;
  const confidence = Math.min(1.0, 0.5 + (bestScore / Math.max(totalKeywords, 1)) * 0.5);

  return {
    intent: bestIntent,
    confidence,
    boosts: INTENT_BOOSTS[bestIntent] ?? {},
  };
}
