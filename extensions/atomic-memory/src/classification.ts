/**
 * Classification — 人事時地物 category detection and confidence management.
 *
 * Rule-based classification with optional Ollama fallback for ambiguous cases.
 */

import type { AtomCategory, Confidence } from "./types.js";
import type { OllamaClient } from "./ollama-client.js";

// ============================================================================
// Pattern-based classification rules
// ============================================================================

type ClassificationRule = {
  category: AtomCategory;
  patterns: RegExp[];
  weight: number;
};

const RULES: ClassificationRule[] = [
  // Person (人): names, titles, relationships, contact info
  {
    category: "person",
    patterns: [
      // Chinese relationship/title terms
      /(?:老闆|同事|朋友|客戶|主管|經理|總監|老師|同學|鄰居|家人|太太|先生|爸|媽|哥|姐|弟|妹)/,
      // "X 是誰" / "X is my"
      /(?:是誰|是我的|is\s+my|is\s+a\s+(?:friend|colleague|boss|client))/i,
      // Phone numbers
      /(?:\+?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4})/,
      // Email
      /[\w.-]+@[\w.-]+\.\w+/,
      // "他/她 + verb" patterns
      /(?:他|她)(?:是|叫|住|在|喜歡|討厭|偏好)/,
      // English name + role patterns
      /(?:name\s+is|called|known\s+as)/i,
      // "記住...的" + personal info
      /記住.{1,10}(?:電話|地址|信箱|email|生日|名字)/,
    ],
    weight: 1.0,
  },
  // Topic (事): projects, decisions, ongoing subjects
  {
    category: "topic",
    patterns: [
      // Project/task terms
      /(?:專案|計畫|project|任務|task|議題|issue)/i,
      // Decision keywords
      /(?:決定|決策|decided|agreed|確認|結論|定案)/i,
      // Meeting/discussion
      /(?:討論|會議|meeting|開會|review|檢討)/i,
      // Budget/planning
      /(?:預算|budget|規劃|planning|排程|schedule)/i,
      // Work items
      /(?:需求|requirement|功能|feature|報告|report)/i,
      // Status update
      /(?:進度|progress|狀態|status|完成|完工)/i,
    ],
    weight: 0.9,
  },
  // Event (時): dates, deadlines, schedules, temporal facts
  {
    category: "event",
    patterns: [
      // Explicit dates
      /\d{4}[/-]\d{1,2}[/-]\d{1,2}/,
      // Relative time
      /(?:下週|上週|明天|後天|昨天|今天|下個月|上個月)/,
      /(?:next\s+(?:week|month|monday|tuesday)|last\s+(?:week|month))/i,
      // Time expressions
      /(?:\d{1,2}[:.]\d{2}|上午|下午|早上|晚上|中午)/,
      // Deadline/schedule keywords
      /(?:截止|deadline|到期|due|提醒|remind|行程|itinerary)/i,
      // Recurring patterns
      /(?:每週|每月|每天|weekly|monthly|daily|定期)/i,
      // Calendar
      /(?:週[一二三四五六日]|星期[一二三四五六日天]|monday|tuesday|wednesday|thursday|friday)/i,
    ],
    weight: 0.9,
  },
  // Place (地): locations, venues, addresses
  {
    category: "place",
    patterns: [
      // Floor/room
      /(?:\d+[fF樓]|會議室|辦公室|教室|room\s*\d)/i,
      // Address patterns
      /(?:路|街|巷|弄|號|市|區|鄉|鎮|county|street|avenue|road)/i,
      // Location keywords
      /(?:地點|location|地址|address|在哪|where)/i,
      // Venue terms
      /(?:餐廳|咖啡廳|公司|學校|醫院|機場|車站|飯店|hotel|office|cafe)/i,
      // Country/city (common ones)
      /(?:台北|台中|高雄|台南|新竹|Tokyo|Taipei|Shanghai)/i,
    ],
    weight: 0.8,
  },
  // Thing (物): objects, tools, resources, preferences
  {
    category: "thing",
    patterns: [
      // Tool/software
      /(?:工具|tool|軟體|software|app|應用|系統|system|平台|platform)/i,
      // Document/file
      /(?:文件|document|檔案|file|模板|template|表格|form)/i,
      // Preference
      /(?:喜歡|prefer|偏好|愛用|常用|favourite|favorite)/i,
      // Resource
      /(?:資源|resource|帳號|account|密碼|連結|link|URL)/i,
      // Object/item
      /(?:買|購|訂|order|東西|物品|設備|device|機器)/i,
    ],
    weight: 0.7,
  },
];

// ============================================================================
// Classification engine
// ============================================================================

/**
 * Classify a text fact into one of the 人事時地物 categories.
 * Uses rule-based pattern matching with weighted scoring.
 */
export function classifyFact(text: string): AtomCategory {
  const scores: Record<AtomCategory, number> = {
    person: 0,
    topic: 0,
    event: 0,
    place: 0,
    thing: 0,
  };

  for (const rule of RULES) {
    let matchCount = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      scores[rule.category] += matchCount * rule.weight;
    }
  }

  // Find the highest scoring category
  let best: AtomCategory = "thing"; // default fallback
  let bestScore = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = cat as AtomCategory;
    }
  }

  return best;
}

/**
 * Classify using Ollama LLM for ambiguous cases.
 * Falls back to rule-based classification if Ollama is unavailable.
 */
export async function classifyFactWithLLM(
  text: string,
  ollama: OllamaClient,
): Promise<AtomCategory> {
  // Try rule-based first
  const ruleResult = classifyFact(text);

  // Check if the rule-based result is confident (>= 2 pattern matches)
  const scores: Record<string, number> = {};
  for (const rule of RULES) {
    let matchCount = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) matchCount++;
    }
    scores[rule.category] = matchCount;
  }

  const topScore = Math.max(...Object.values(scores));
  if (topScore >= 2) {
    return ruleResult; // Confident enough
  }

  // Use Ollama for disambiguation
  try {
    const response = await ollama.chat(
      `你是一個分類器。將以下文字分類為恰好一個類別。
只輸出 JSON: {"category": "person|topic|event|place|thing"}

分類標準：
- person（人）：關於人的資訊、關係、聯絡方式、偏好
- topic（事）：專案、決策、工作項目、討論主題
- event（時）：日期、時程、行程、截止日
- place（地）：地點、地址、場所
- thing（物）：工具、文件、物品、資源`,
      text,
      { jsonMode: true, temperature: 0.1, maxTokens: 50, timeoutMs: 3_000 },
    );

    const parsed = JSON.parse(response) as { category?: string };
    const cat = parsed.category;
    if (cat && ["person", "topic", "event", "place", "thing"].includes(cat)) {
      return cat as AtomCategory;
    }
  } catch {
    // Fallback to rule-based
  }

  return ruleResult;
}
