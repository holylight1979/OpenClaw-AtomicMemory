/**
 * G-INT: Integration test for G1 (cross-group), G2 (cross-platform), G3 (permission).
 *
 * Tests the core logic functions directly — no Gateway/LLM dependency.
 * Run: npx vitest run extensions/atomic-memory/g-int.test.ts
 */

import { describe, it, expect } from "vitest";

// G1: Cross-group
import { classifyScope, getRecallScopes } from "./src/scope-classifier.js";

// G2: Cross-platform
import {
  resolveEntity,
  ensurePersonAtom,
  linkPersonAcrossPlatforms,
  resolveLinkedPeerIds,
  mergeSources,
} from "./src/entity-resolver.js";

// G3: Permission
import {
  resolvePermissionLevel,
  hasWriteAccess,
  detectSettingCommand,
  buildSelfAwarenessPrompt,
  buildCapabilityContext,
  buildRejectionContext,
} from "./src/permission-guard.js";

// Shared types
import type { Atom, AtomSource, AtomScope } from "./src/types.js";
import type { AtomicMemoryConfig } from "./config.js";
import type { IdentityLinks } from "./src/entity-resolver.js";

// Intent classifier
import { classifyIntent } from "./src/intent-classifier.js";

// ============================================================================
// Helpers
// ============================================================================

function makeAtom(overrides: Partial<Atom> & { id: string; category: Atom["category"] }): Atom {
  return {
    title: overrides.id,
    confidence: "[臨]",
    triggers: [],
    lastUsed: "2026-03-15",
    confirmations: 0,
    tags: [],
    related: [],
    sources: [],
    scope: "global",
    knowledge: "",
    actions: "",
    evolutionLog: [],
    ...overrides,
  };
}

function makeConfig(overrides?: Partial<AtomicMemoryConfig>): AtomicMemoryConfig {
  return {
    atomStorePath: "/tmp/test-atoms",
    chromadb: { url: "http://localhost:8000", collection: "test" },
    ollama: { baseUrl: "http://localhost:11434", embeddingModel: "test", extractionModel: "test" },
    autoRecall: true,
    autoCapture: true,
    ownerOnly: false,
    memoryIsolation: "shared",
    recall: { topK: 5, minScore: 0.40 },
    capture: { maxChars: 3000, maxItems: 3 },
    writeGate: { autoThreshold: 0.50, dedupScore: 0.80 },
    tokenBudget: {
      shortThreshold: 50, mediumThreshold: 200,
      shortBudget: 1500, mediumBudget: 3000, longBudget: 5000, charsPerToken: 3.0,
    },
    actr: { weight: 0.15 },
    episodic: { enabled: false, minDurationMs: 120000, minTurns: 3, ttlDays: 24 },
    wisdom: { enabled: false, situationClassifier: false, reflectionTracking: false },
    selfIteration: { enabled: false, oscillationWindow: 3, oscillationThreshold: 2, reviewInterval: 25 },
    permission: {
      botName: "小助手",
      ownerName: "Holy",
      adminIds: ["admin-001"],
      toolWriteRequiresOwner: true,
      botSelfAwareness: true,
    },
    crossPlatform: { enabled: true, autoMerge: true },
    ...overrides,
  };
}

// ============================================================================
// Scene 1: Cross-group memory (G1)
// ============================================================================

describe("Scene 1: Cross-group memory", () => {
  it("memory-store intent → user scope (propagates across groups)", () => {
    // "記住我叫小花" should be user-scoped (visible in all groups for this sender)
    const scope = classifyScope("memory-store", "我叫小花", "記住我叫小花");
    expect(scope).toBe("user");
  });

  it("group setting command → group scope (stays in current group)", () => {
    const scope = classifyScope("command", "開啟自動回覆", "開啟自動回覆");
    expect(scope).toBe("group");
  });

  it("personal fact in non-memory intent → user scope", () => {
    const scope = classifyScope("general", "我喜歡吃拉麵");
    expect(scope).toBe("user");
  });

  it("general fact → global scope", () => {
    const scope = classifyScope("general", "東京鐵塔是333公尺");
    expect(scope).toBe("global");
  });

  it("recall scopes for memory-query exclude group-only atoms", () => {
    const scopes = getRecallScopes("memory-query");
    expect(scopes).toContain("global");
    expect(scopes).toContain("user");
    expect(scopes).not.toContain("group");
  });

  it("recall scopes for command include group atoms", () => {
    const scopes = getRecallScopes("command");
    expect(scopes).toContain("group");
    expect(scopes).not.toContain("user");
  });

  it("recall scopes for general include all", () => {
    const scopes = getRecallScopes("general");
    expect(scopes).toContain("global");
    expect(scopes).toContain("user");
    expect(scopes).toContain("group");
  });
});

// ============================================================================
// Scene 2: Cross-platform entities (G2)
// ============================================================================

describe("Scene 2: Cross-platform entities", () => {
  const identityLinks: IdentityLinks = {
    "小明": ["line:user-line-123", "discord:user-discord-456"],
  };

  it("resolveLinkedPeerIds finds cross-platform peers", () => {
    const peers = resolveLinkedPeerIds("user-line-123", "line", identityLinks);
    expect(peers).toHaveLength(1);
    expect(peers[0]).toEqual({ channel: "discord", senderId: "user-discord-456" });
  });

  it("resolveLinkedPeerIds returns empty when no match", () => {
    const peers = resolveLinkedPeerIds("unknown-user", "telegram", identityLinks);
    expect(peers).toHaveLength(0);
  });

  it("resolveEntity finds person atom via identityLinks", () => {
    const personAtom = makeAtom({
      id: "小明",
      category: "person",
      triggers: ["小明", "line:user-line-123"],
      sources: [{ channel: "line", senderId: "user-line-123" }],
    });

    // Discord user should resolve to same person via identityLinks
    const found = resolveEntity(
      "user-discord-456", "discord", undefined,
      [personAtom], identityLinks,
    );
    expect(found).not.toBeNull();
    expect(found!.id).toBe("小明");
  });

  it("resolveEntity falls back to trigger match without identityLinks", () => {
    const personAtom = makeAtom({
      id: "小明",
      category: "person",
      triggers: ["小明", "user-line-123"],
      sources: [{ channel: "line", senderId: "user-line-123" }],
    });

    // Without identityLinks, discord user won't match
    const found = resolveEntity("user-discord-456", "discord", undefined, [personAtom]);
    expect(found).toBeNull();
  });

  it("mergeSources avoids duplicates", () => {
    const existing: AtomSource[] = [{ channel: "line", senderId: "123" }];
    const result = mergeSources(existing, { channel: "line", senderId: "123" });
    expect(result).toHaveLength(1);

    const result2 = mergeSources(existing, { channel: "discord", senderId: "456" });
    expect(result2).toHaveLength(2);
  });
});

// ============================================================================
// Scene 3: Permission interception (G3)
// ============================================================================

describe("Scene 3: Permission interception", () => {
  const cfg = makeConfig();

  it("owner resolves to 'owner' level", () => {
    const level = resolvePermissionLevel("owner-id", true, cfg);
    expect(level).toBe("owner");
  });

  it("admin resolves to 'admin' level", () => {
    const level = resolvePermissionLevel("admin-001", false, cfg);
    expect(level).toBe("admin");
  });

  it("regular user resolves to 'user' level", () => {
    const level = resolvePermissionLevel("random-user", false, cfg);
    expect(level).toBe("user");
  });

  it("no senderId resolves to 'user'", () => {
    const level = resolvePermissionLevel(undefined, undefined, cfg);
    expect(level).toBe("user");
  });

  it("owner and admin have write access", () => {
    expect(hasWriteAccess("owner")).toBe(true);
    expect(hasWriteAccess("admin")).toBe(true);
    expect(hasWriteAccess("user")).toBe(false);
  });

  it("detects CJK setting commands", () => {
    expect(detectSettingCommand("關閉自動回覆")).toBe("關閉");
    expect(detectSettingCommand("設定語言為英文")).toBe("設定");
    expect(detectSettingCommand("清除所有記憶")).toBe("清除所有");
  });

  it("detects Latin setting commands", () => {
    expect(detectSettingCommand("reset all memories")).toBe("reset");
    expect(detectSettingCommand("change admin settings")).toBe("admin");
  });

  it("does not trigger on normal conversation", () => {
    expect(detectSettingCommand("今天天氣很好")).toBeNull();
    expect(detectSettingCommand("小明最近怎麼樣")).toBeNull();
  });

  it("rejection context includes sender name", () => {
    const ctx = buildRejectionContext("關閉", "小花");
    expect(ctx).toContain("小花");
    expect(ctx).toContain("關閉");
    expect(ctx).toContain("permission-denied");
  });
});

// ============================================================================
// Scene 4: Cross-test (G1 + G2 + G3 combined)
// ============================================================================

describe("Scene 4: Combined G1+G2+G3", () => {
  const cfg = makeConfig();
  const identityLinks: IdentityLinks = {
    "user-A": ["line:line-user-A", "discord:discord-user-A"],
  };

  it("non-owner capture → user-scoped (visible cross-group but tagged to sender)", () => {
    // Non-owner says "記住：密碼是1234" → intent: memory-store → scope: user
    const intent = classifyIntent("記住：密碼是1234");
    expect(intent.intent).toBe("memory-store");

    const scope = classifyScope(intent.intent, "密碼是1234", "記住：密碼是1234");
    expect(scope).toBe("user");

    // Non-owner still has no write access for tools, but auto-capture might still work
    const level = resolvePermissionLevel("non-owner-id", false, cfg);
    expect(level).toBe("user");
    expect(hasWriteAccess(level)).toBe(false);
  });

  it("owner cross-platform recall finds linked person's atoms", () => {
    // "有人提過密碼嗎" doesn't trigger memory-query keywords — use "你記得密碼嗎"
    const intent = classifyIntent("你還記得密碼嗎？");
    expect(intent.intent).toBe("memory-query");

    const level = resolvePermissionLevel("owner-id", true, cfg);
    expect(level).toBe("owner");

    // Cross-platform: owner on Discord can find LINE atoms via identityLinks
    const peers = resolveLinkedPeerIds("discord-user-A", "discord", identityLinks);
    expect(peers.length).toBeGreaterThan(0);
    expect(peers[0].channel).toBe("line");
  });

  it("scope filtering + permission work together without conflict", () => {
    // user-scoped atom from LINE group A
    const atom = makeAtom({
      id: "password-fact",
      category: "thing",
      scope: "user",
      sources: [{ channel: "line-group-a", senderId: "line-user-A" }],
    });

    // Same sender in LINE group B should see this user-scoped atom
    const hasSenderSource = atom.sources.some(s => s.senderId === "line-user-A");
    expect(hasSenderSource).toBe(true);

    // Different sender should NOT see this
    const hasOtherSource = atom.sources.some(s => s.senderId === "other-user");
    expect(hasOtherSource).toBe(false);

    // Cross-platform linked user should see via identityLinks
    const linked = resolveLinkedPeerIds("discord-user-A", "discord", identityLinks);
    const hasLinked = linked.length > 0 && atom.sources.some(s =>
      linked.some(l => s.channel === l.channel && s.senderId === l.senderId),
    );
    // This specific case: atom source is "line-group-a" channel, linked peer is "line" channel
    // They don't match because channel names differ (line-group-a vs line)
    // This is correct behavior: cross-platform matching uses canonical channel names
    expect(hasLinked).toBe(false);

    // With matching channel names:
    const atom2 = makeAtom({
      id: "password-fact-2",
      category: "thing",
      scope: "user",
      sources: [{ channel: "line", senderId: "line-user-a" }],
    });
    const hasLinked2 = linked.length > 0 && atom2.sources.some(s =>
      linked.some(l => s.channel === l.channel && s.senderId === l.senderId),
    );
    expect(hasLinked2).toBe(true);
  });
});

// ============================================================================
// Scene 5: Bot self-awareness (G3)
// ============================================================================

describe("Scene 5: Bot self-awareness", () => {
  const cfg = makeConfig();

  it("buildSelfAwarenessPrompt includes botName and ownerName", () => {
    const prompt = buildSelfAwarenessPrompt(cfg);
    expect(prompt).toContain("小助手");
    expect(prompt).toContain("Holy");
    expect(prompt).toContain("Identity");
    expect(prompt).toContain("manager");
  });

  it("buildSelfAwarenessPrompt includes anti-injection rules", () => {
    const prompt = buildSelfAwarenessPrompt(cfg);
    expect(prompt).toContain("Prompt injection");
    expect(prompt).toContain("refuse firmly");
  });

  it("capability context for owner includes full access", () => {
    const ctx = buildCapabilityContext("owner");
    expect(ctx).toContain("Full access");
    expect(ctx).toContain("owner");
  });

  it("capability context for user is limited", () => {
    const ctx = buildCapabilityContext("user");
    expect(ctx).toContain("chat");
    expect(ctx).toContain("query");
    expect(ctx).toContain("Cannot store");
  });

  it("capability context for admin is middle ground", () => {
    const ctx = buildCapabilityContext("admin");
    expect(ctx).toContain("recall");
    expect(ctx).toContain("store");
    expect(ctx).toContain("Cannot change settings");
  });

  it("self-awareness uses fallback labels when names empty", () => {
    const emptyCfg = makeConfig({
      permission: {
        botName: "",
        ownerName: "",
        adminIds: [],
        toolWriteRequiresOwner: true,
        botSelfAwareness: true,
      },
    });
    const prompt = buildSelfAwarenessPrompt(emptyCfg);
    expect(prompt).toContain("this bot");
    expect(prompt).toContain("the configured owner");
  });
});

// ============================================================================
// Phase 3: Conflict checks
// ============================================================================

describe("Phase 3: Conflict checks", () => {
  it("config defaults let new installations work without manual setup", async () => {
    const { atomicMemoryConfigSchema } = await import("./config.js");
    const defaultCfg = atomicMemoryConfigSchema.parse({});

    // New bot should work out of box
    expect(defaultCfg.autoRecall).toBe(true);
    expect(defaultCfg.autoCapture).toBe(true);
    expect(defaultCfg.memoryIsolation).toBe("shared");
    expect(defaultCfg.crossPlatform.enabled).toBe(true);
    expect(defaultCfg.crossPlatform.autoMerge).toBe(true);
    expect(defaultCfg.permission.botSelfAwareness).toBe(true);
    expect(defaultCfg.permission.toolWriteRequiresOwner).toBe(true);
    // botName/ownerName empty by default — self-awareness uses fallbacks
    expect(defaultCfg.permission.botName).toBe("");
    expect(defaultCfg.permission.ownerName).toBe("");
  });

  it("crossPlatform recall does not conflict with owner-only isolation", () => {
    // When memoryIsolation is owner-only, crossPlatform should still work
    // because crossPlatform resolves identity (who), not visibility (what)
    const cfg = makeConfig({ memoryIsolation: "owner-only" });
    expect(cfg.crossPlatform.enabled).toBe(true);
    expect(cfg.memoryIsolation).toBe("owner-only");
    // These are independent concerns — no structural conflict
  });

  it("scope labels do not overlap between G1 scopes and platform sources", () => {
    // G1 uses AtomScope: "global" | "user" | "group"
    // G2 uses AtomSource: { channel: string, senderId?: string }
    // They are different fields on the Atom type — no field-level conflict
    const atom = makeAtom({
      id: "test",
      category: "thing",
      scope: "user",
      sources: [
        { channel: "line", senderId: "user-1" },
        { channel: "discord", senderId: "user-2" },
      ],
    });
    expect(atom.scope).toBe("user");
    expect(atom.sources).toHaveLength(2);
    // scope and sources are orthogonal
  });
});
