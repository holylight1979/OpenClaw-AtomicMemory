/**
 * Atomic Memory Plugin — Configuration schema + defaults.
 *
 * Uses manual parse/validate pattern matching memory-lancedb's configSchema.
 */

import { homedir } from "node:os";
import { join } from "node:path";

// ============================================================================
// Config type
// ============================================================================

export type MemoryIsolation = "shared" | "user-scoped" | "owner-only";

export type AtomicMemoryConfig = {
  atomStorePath: string;
  chromadb: {
    url: string;
    collection: string;
  };
  ollama: {
    baseUrl: string;
    embeddingModel: string;
    extractionModel: string;
  };
  autoRecall: boolean;
  autoCapture: boolean;
  ownerOnly: boolean;
  /** Memory isolation mode: shared (default), user-scoped, or owner-only. */
  memoryIsolation: MemoryIsolation;
  recall: {
    topK: number;
    minScore: number;
  };
  capture: {
    maxChars: number;
    maxItems: number;
  };
  writeGate: {
    autoThreshold: number;
    dedupScore: number;
  };
  tokenBudget: {
    /** Prompt length threshold: short (< shortThreshold chars). */
    shortThreshold: number;
    /** Prompt length threshold: medium (< mediumThreshold chars). */
    mediumThreshold: number;
    /** Token budget for short prompts. */
    shortBudget: number;
    /** Token budget for medium prompts. */
    mediumBudget: number;
    /** Token budget for long prompts. */
    longBudget: number;
    /** Approximate chars per token (CJK average). */
    charsPerToken: number;
  };
  actr: {
    /** Weight of ACT-R activation in the ranking formula (0–1). */
    weight: number;
  };
  episodic: {
    /** Generate episodic summary atoms on session end. Default true. */
    enabled: boolean;
    /** Minimum session duration (ms) to trigger episodic generation. Default 120000. */
    minDurationMs: number;
    /** Minimum turns to trigger episodic generation. Default 3. */
    minTurns: number;
    /** Days before episodic atoms are auto-cleaned. Default 24. */
    ttlDays: number;
  };
  wisdom: {
    /** Master switch — opt-in. Default false. */
    enabled: boolean;
    /** Enable situation classifier (direct/confirm/plan). Default true if wisdom enabled. */
    situationClassifier: boolean;
    /** Enable reflection tracking (accuracy metrics). Default true if wisdom enabled. */
    reflectionTracking: boolean;
  };
  selfIteration: {
    /** Enable self-iteration subsystem. Default true. */
    enabled: boolean;
    /** Number of recent episodics to scan for oscillation. Default 3. */
    oscillationWindow: number;
    /** Minimum distinct sessions an atom must appear in to flag oscillation. Default 2. */
    oscillationThreshold: number;
    /** Episodic count between periodic reviews. Default 25. */
    reviewInterval: number;
    /** Code modification guard settings for self-evolution (Phase 3). */
    codeModification: {
      /** Enable code self-modification capability. Default false (opt-in). */
      enabled: boolean;
      /** Absolute path to the OpenClaw source root. Required when enabled. */
      sourceDir: string;
      /** Directories (relative to sourceDir) allowed for modification. */
      allowedPaths: string[];
      /** Directories/files (relative to sourceDir) blocked from modification. */
      blockedPaths: string[];
      /** Max files modifiable in a single evolution pass. Default 10. */
      maxFilesPerPass: number;
      /** Max total lines changed in a single evolution pass. Default 500. */
      maxLinesPerPass: number;
      /** Require build success before committing. Default true. */
      requireBuildPass: boolean;
      /** Auto-revert on build failure. Default true. */
      autoRevertOnFailure: boolean;
    };
    /** OETAV autonomous iteration settings (Phase A+). */
    autonomousIteration: {
      /** Enable OETAV signal collection + evidence accumulation. Default true. */
      enabled: boolean;
      /** Evidence score decay rate per session (0-1). Default 0.95. */
      evidenceDecayRate: number;
      /** M2: Entropy signal config. */
      entropy: {
        enabled: boolean;
        rigidThreshold: number;
        chaoticThreshold: number;
        tierWeight: number;
      };
      /** M2: Order parameter config. */
      orderParameter: {
        rigidBound: number;
        chaoticBound: number;
      };
      /** M7: Flow balance config. */
      flowBalance: {
        enabled: boolean;
        steadyBand: number;
      };
      /** M7: Observer overhead budget. */
      observerOverhead: {
        enabled: boolean;
        budgetMs: number;
      };
      /** M4: Stale evidence policy. */
      staleEvidence: {
        gracePeriodCycles: number;
        decayRate: number;
        archiveThreshold: number;
      };
    };
  };
  permission: {
    /** Bot's display name for self-awareness (e.g. "小助手"). */
    botName: string;
    /** Display name for the owner (injected into bot self-awareness prompt). */
    ownerName: string;
    /** Platform user IDs granted admin privileges (can write/delete memories). */
    adminIds: string[];
    /** Require owner/admin for atom_store/atom_forget tools. Default true. */
    toolWriteRequiresOwner: boolean;
    /** Inject self-awareness prompt (who owns me, permission boundaries). Default true. */
    botSelfAwareness: boolean;
    /** Commands accessible to guest users (not in any allowlist). */
    guestCommands: string[];
  };
  crossPlatform: {
    /** Enable cross-platform recall (query across all channels for person/info-request). Default true. */
    enabled: boolean;
    /** Enable automatic person atom merging when identityLinks match. Default true. */
    autoMerge: boolean;
  };
  /** Path to System.Owner.json for unified identity registry. Default ~/.openclaw/System.Owner.json. */
  systemIdentityPath: string;
};

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_ATOM_STORE_PATH = join(homedir(), ".openclaw", "memory", "atoms");
const DEFAULT_CHROMADB_URL = "http://localhost:8000";
const DEFAULT_COLLECTION = "openclaw_atoms";
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_EMBEDDING_MODEL = "qwen3-embedding";
const DEFAULT_EXTRACTION_MODEL = "qwen3:1.7b";

// ============================================================================
// Config schema (parse + uiHints)
// ============================================================================

function assertAllowedKeys(value: Record<string, unknown>, allowed: string[], label: string) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new Error(`${label} has unknown keys: ${unknown.join(", ")}`);
  }
}

function numOrDefault(value: unknown, def: number, min?: number, max?: number): number {
  if (typeof value !== "number") return def;
  const v = value;
  if (min !== undefined && v < min) return def;
  if (max !== undefined && v > max) return def;
  return v;
}

function boolOrDefault(value: unknown, def: boolean): boolean {
  return typeof value === "boolean" ? value : def;
}

function strOrDefault(value: unknown, def: string): string {
  return typeof value === "string" && value.length > 0 ? value : def;
}

export const atomicMemoryConfigSchema = {
  parse(value: unknown): AtomicMemoryConfig {
    const cfg = (value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {}) as Record<string, unknown>;

    assertAllowedKeys(
      cfg,
      ["atomStorePath", "chromadb", "ollama", "autoRecall", "autoCapture", "ownerOnly", "memoryIsolation", "recall", "capture", "writeGate", "tokenBudget", "actr", "episodic", "wisdom", "selfIteration", "permission", "crossPlatform", "systemIdentityPath"],
      "atomic-memory config",
    );

    // chromadb sub-config
    const chromadbRaw = (cfg.chromadb ?? {}) as Record<string, unknown>;
    assertAllowedKeys(chromadbRaw, ["url", "collection"], "chromadb config");

    // ollama sub-config
    const ollamaRaw = (cfg.ollama ?? {}) as Record<string, unknown>;
    assertAllowedKeys(ollamaRaw, ["baseUrl", "embeddingModel", "extractionModel"], "ollama config");

    // recall sub-config
    const recallRaw = (cfg.recall ?? {}) as Record<string, unknown>;
    assertAllowedKeys(recallRaw, ["topK", "minScore"], "recall config");

    // capture sub-config
    const captureRaw = (cfg.capture ?? {}) as Record<string, unknown>;
    assertAllowedKeys(captureRaw, ["maxChars", "maxItems"], "capture config");

    // writeGate sub-config
    const writeGateRaw = (cfg.writeGate ?? {}) as Record<string, unknown>;
    assertAllowedKeys(writeGateRaw, ["autoThreshold", "dedupScore"], "writeGate config");

    // tokenBudget sub-config
    const tokenBudgetRaw = (cfg.tokenBudget ?? {}) as Record<string, unknown>;
    assertAllowedKeys(tokenBudgetRaw, ["shortThreshold", "mediumThreshold", "shortBudget", "mediumBudget", "longBudget", "charsPerToken"], "tokenBudget config");

    // actr sub-config
    const actrRaw = (cfg.actr ?? {}) as Record<string, unknown>;
    assertAllowedKeys(actrRaw, ["weight"], "actr config");

    // episodic sub-config
    const episodicRaw = (cfg.episodic ?? {}) as Record<string, unknown>;
    assertAllowedKeys(episodicRaw, ["enabled", "minDurationMs", "minTurns", "ttlDays"], "episodic config");

    // wisdom sub-config
    const wisdomRaw = (cfg.wisdom ?? {}) as Record<string, unknown>;
    assertAllowedKeys(wisdomRaw, ["enabled", "situationClassifier", "reflectionTracking"], "wisdom config");

    // selfIteration sub-config
    const selfIterationRaw = (cfg.selfIteration ?? {}) as Record<string, unknown>;
    assertAllowedKeys(selfIterationRaw, ["enabled", "oscillationWindow", "oscillationThreshold", "reviewInterval", "codeModification", "autonomousIteration"], "selfIteration config");

    // selfIteration.codeModification sub-config
    const codeModRaw = (selfIterationRaw.codeModification ?? {}) as Record<string, unknown>;
    assertAllowedKeys(codeModRaw, ["enabled", "sourceDir", "allowedPaths", "blockedPaths", "maxFilesPerPass", "maxLinesPerPass", "requireBuildPass", "autoRevertOnFailure"], "selfIteration.codeModification config");

    // selfIteration.autonomousIteration sub-config
    const autoIterRaw = (selfIterationRaw.autonomousIteration ?? {}) as Record<string, unknown>;
    assertAllowedKeys(autoIterRaw, ["enabled", "evidenceDecayRate", "entropy", "orderParameter", "flowBalance", "observerOverhead", "staleEvidence"], "selfIteration.autonomousIteration config");

    const entropyRaw = (autoIterRaw.entropy ?? {}) as Record<string, unknown>;
    assertAllowedKeys(entropyRaw, ["enabled", "rigidThreshold", "chaoticThreshold", "tierWeight"], "autonomousIteration.entropy config");

    const orderParamRaw = (autoIterRaw.orderParameter ?? {}) as Record<string, unknown>;
    assertAllowedKeys(orderParamRaw, ["rigidBound", "chaoticBound"], "autonomousIteration.orderParameter config");

    const flowBalanceRaw = (autoIterRaw.flowBalance ?? {}) as Record<string, unknown>;
    assertAllowedKeys(flowBalanceRaw, ["enabled", "steadyBand"], "autonomousIteration.flowBalance config");

    const overheadRaw = (autoIterRaw.observerOverhead ?? {}) as Record<string, unknown>;
    assertAllowedKeys(overheadRaw, ["enabled", "budgetMs"], "autonomousIteration.observerOverhead config");

    const staleEvidenceRaw = (autoIterRaw.staleEvidence ?? {}) as Record<string, unknown>;
    assertAllowedKeys(staleEvidenceRaw, ["gracePeriodCycles", "decayRate", "archiveThreshold"], "autonomousIteration.staleEvidence config");

    // permission sub-config
    const permissionRaw = (cfg.permission ?? {}) as Record<string, unknown>;
    assertAllowedKeys(permissionRaw, ["botName", "ownerName", "adminIds", "toolWriteRequiresOwner", "botSelfAwareness", "guestCommands"], "permission config");

    // crossPlatform sub-config
    const crossPlatformRaw = (cfg.crossPlatform ?? {}) as Record<string, unknown>;
    assertAllowedKeys(crossPlatformRaw, ["enabled", "autoMerge"], "crossPlatform config");

    return {
      atomStorePath: strOrDefault(cfg.atomStorePath, DEFAULT_ATOM_STORE_PATH),
      chromadb: {
        url: strOrDefault(chromadbRaw.url, DEFAULT_CHROMADB_URL),
        collection: strOrDefault(chromadbRaw.collection, DEFAULT_COLLECTION),
      },
      ollama: {
        baseUrl: strOrDefault(ollamaRaw.baseUrl, DEFAULT_OLLAMA_URL),
        embeddingModel: strOrDefault(ollamaRaw.embeddingModel, DEFAULT_EMBEDDING_MODEL),
        extractionModel: strOrDefault(ollamaRaw.extractionModel, DEFAULT_EXTRACTION_MODEL),
      },
      autoRecall: boolOrDefault(cfg.autoRecall, true),
      autoCapture: boolOrDefault(cfg.autoCapture, true),
      ownerOnly: boolOrDefault(cfg.ownerOnly, true),
      memoryIsolation: (["shared", "user-scoped", "owner-only"] as const).includes(cfg.memoryIsolation as any)
        ? (cfg.memoryIsolation as MemoryIsolation)
        : "shared",
      recall: {
        topK: numOrDefault(recallRaw.topK, 5, 1, 20),
        minScore: numOrDefault(recallRaw.minScore, 0.40, 0, 1),
      },
      capture: {
        maxChars: numOrDefault(captureRaw.maxChars, 3000, 100, 10000),
        maxItems: numOrDefault(captureRaw.maxItems, 3, 1, 10),
      },
      writeGate: {
        autoThreshold: numOrDefault(writeGateRaw.autoThreshold, 0.50, 0, 1),
        dedupScore: numOrDefault(writeGateRaw.dedupScore, 0.80, 0, 1),
      },
      tokenBudget: {
        shortThreshold: numOrDefault(tokenBudgetRaw.shortThreshold, 50, 1, 500),
        mediumThreshold: numOrDefault(tokenBudgetRaw.mediumThreshold, 200, 50, 1000),
        shortBudget: numOrDefault(tokenBudgetRaw.shortBudget, 1500, 500, 10000),
        mediumBudget: numOrDefault(tokenBudgetRaw.mediumBudget, 3000, 1000, 20000),
        longBudget: numOrDefault(tokenBudgetRaw.longBudget, 5000, 2000, 30000),
        charsPerToken: numOrDefault(tokenBudgetRaw.charsPerToken, 3.0, 1, 10),
      },
      actr: {
        weight: numOrDefault(actrRaw.weight, 0.15, 0, 1),
      },
      episodic: {
        enabled: boolOrDefault(episodicRaw.enabled, true),
        minDurationMs: numOrDefault(episodicRaw.minDurationMs, 120_000, 0, 3_600_000),
        minTurns: numOrDefault(episodicRaw.minTurns, 3, 1, 100),
        ttlDays: numOrDefault(episodicRaw.ttlDays, 24, 1, 365),
      },
      wisdom: {
        enabled: boolOrDefault(wisdomRaw.enabled, false),
        situationClassifier: boolOrDefault(wisdomRaw.situationClassifier, true),
        reflectionTracking: boolOrDefault(wisdomRaw.reflectionTracking, true),
      },
      selfIteration: {
        enabled: boolOrDefault(selfIterationRaw.enabled, true),
        oscillationWindow: numOrDefault(selfIterationRaw.oscillationWindow, 3, 1, 20),
        oscillationThreshold: numOrDefault(selfIterationRaw.oscillationThreshold, 2, 1, 10),
        reviewInterval: numOrDefault(selfIterationRaw.reviewInterval, 25, 1, 200),
        codeModification: {
          enabled: boolOrDefault(codeModRaw.enabled, false),
          sourceDir: strOrDefault(codeModRaw.sourceDir, ""),
          allowedPaths: Array.isArray(codeModRaw.allowedPaths)
            ? (codeModRaw.allowedPaths as unknown[]).filter((v): v is string => typeof v === "string")
            : ["extensions/", "skills/", "_AIDocs/"],
          blockedPaths: Array.isArray(codeModRaw.blockedPaths)
            ? (codeModRaw.blockedPaths as unknown[]).filter((v): v is string => typeof v === "string")
            : ["src/gateway/", "src/config/", ".env", "System.Owner.json"],
          maxFilesPerPass: numOrDefault(codeModRaw.maxFilesPerPass, 10, 1, 50),
          maxLinesPerPass: numOrDefault(codeModRaw.maxLinesPerPass, 500, 10, 5000),
          requireBuildPass: boolOrDefault(codeModRaw.requireBuildPass, true),
          autoRevertOnFailure: boolOrDefault(codeModRaw.autoRevertOnFailure, true),
        },
        autonomousIteration: {
          enabled: boolOrDefault(autoIterRaw.enabled, true),
          evidenceDecayRate: numOrDefault(autoIterRaw.evidenceDecayRate, 0.95, 0.5, 1),
          entropy: {
            enabled: boolOrDefault(entropyRaw.enabled, true),
            rigidThreshold: numOrDefault(entropyRaw.rigidThreshold, 0.3, 0, 1),
            chaoticThreshold: numOrDefault(entropyRaw.chaoticThreshold, 0.85, 0, 1),
            tierWeight: numOrDefault(entropyRaw.tierWeight, 0.6, 0, 1),
          },
          orderParameter: {
            rigidBound: numOrDefault(orderParamRaw.rigidBound, 0.3, 0, 1),
            chaoticBound: numOrDefault(orderParamRaw.chaoticBound, 0.6, 0, 1),
          },
          flowBalance: {
            enabled: boolOrDefault(flowBalanceRaw.enabled, true),
            steadyBand: numOrDefault(flowBalanceRaw.steadyBand, 0.15, 0, 1),
          },
          observerOverhead: {
            enabled: boolOrDefault(overheadRaw.enabled, true),
            budgetMs: numOrDefault(overheadRaw.budgetMs, 5000, 1000, 30000),
          },
          staleEvidence: {
            gracePeriodCycles: numOrDefault(staleEvidenceRaw.gracePeriodCycles, 3, 1, 20),
            decayRate: numOrDefault(staleEvidenceRaw.decayRate, 0.2, 0, 1),
            archiveThreshold: numOrDefault(staleEvidenceRaw.archiveThreshold, 0.3, 0, 1),
          },
        },
      },
      permission: {
        botName: strOrDefault(permissionRaw.botName, ""),
        ownerName: strOrDefault(permissionRaw.ownerName, ""),
        adminIds: Array.isArray(permissionRaw.adminIds)
          ? (permissionRaw.adminIds as unknown[]).filter((v): v is string => typeof v === "string")
          : [],
        toolWriteRequiresOwner: boolOrDefault(permissionRaw.toolWriteRequiresOwner, true),
        botSelfAwareness: boolOrDefault(permissionRaw.botSelfAwareness, true),
        guestCommands: Array.isArray(permissionRaw.guestCommands)
          ? (permissionRaw.guestCommands as unknown[]).filter((v): v is string => typeof v === "string")
          : ["help", "commands", "whoami", "status", "request-access"],
      },
      crossPlatform: {
        enabled: boolOrDefault(crossPlatformRaw.enabled, true),
        autoMerge: boolOrDefault(crossPlatformRaw.autoMerge, true),
      },
      systemIdentityPath: strOrDefault(
        cfg.systemIdentityPath,
        // Derive from atomStorePath base (same .openclaw root) instead of homedir()
        join(strOrDefault(cfg.atomStorePath, DEFAULT_ATOM_STORE_PATH), "..", "..", "System.Owner.json"),
      ),
    };
  },

  uiHints: {
    atomStorePath: {
      label: "Atom Store Path",
      placeholder: "~/.openclaw/memory/atoms",
      help: "Directory for atom markdown files",
      advanced: true,
    },
    "chromadb.url": {
      label: "ChromaDB URL",
      placeholder: DEFAULT_CHROMADB_URL,
      help: "ChromaDB server URL for vector indexing",
      advanced: true,
    },
    "chromadb.collection": {
      label: "ChromaDB Collection",
      placeholder: DEFAULT_COLLECTION,
      advanced: true,
    },
    "ollama.baseUrl": {
      label: "Ollama URL",
      placeholder: DEFAULT_OLLAMA_URL,
      advanced: true,
    },
    "ollama.embeddingModel": {
      label: "Embedding Model",
      placeholder: DEFAULT_EMBEDDING_MODEL,
      help: "Ollama model for text embeddings",
    },
    "ollama.extractionModel": {
      label: "Extraction Model",
      placeholder: DEFAULT_EXTRACTION_MODEL,
      help: "Ollama model for knowledge extraction",
    },
    autoRecall: {
      label: "Auto-Recall",
      help: "Inject relevant atom memories into agent context automatically",
    },
    autoCapture: {
      label: "Auto-Capture",
      help: "Extract and store facts from conversations automatically",
    },
    ownerOnly: {
      label: "Owner Only",
      help: "Only capture from owner conversations (security)",
    },
    "recall.topK": {
      label: "Top K Results",
      placeholder: "5",
      advanced: true,
    },
    "recall.minScore": {
      label: "Min Score",
      placeholder: "0.55",
      advanced: true,
    },
    "capture.maxChars": {
      label: "Capture Max Chars",
      placeholder: "3000",
      advanced: true,
    },
    "writeGate.autoThreshold": {
      label: "Write Gate Threshold",
      placeholder: "0.50",
      help: "Quality score threshold for auto-storing facts",
      advanced: true,
    },
    "permission.botName": {
      label: "Bot Name",
      placeholder: "",
      help: "Bot's display name for self-awareness (e.g. '小助手')",
    },
    "permission.ownerName": {
      label: "Owner Name",
      placeholder: "",
      help: "Display name for the owner (used in bot self-awareness prompt)",
    },
    "permission.adminIds": {
      label: "Admin IDs",
      help: "Platform user IDs with admin privileges (can manage memories)",
      advanced: true,
    },
    "permission.toolWriteRequiresOwner": {
      label: "Tool Write Requires Owner",
      help: "Only owner can use atom_store/atom_forget tools",
    },
    "permission.botSelfAwareness": {
      label: "Bot Self-Awareness",
      help: "Inject permission awareness into bot system prompt",
    },
  },
};
