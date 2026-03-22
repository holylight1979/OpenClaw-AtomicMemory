/**
 * OpenClaw Atomic Memory Plugin
 *
 * Structured knowledge memory with confidence tiers (人事時地物).
 * Uses Ollama for local LLM extraction and ChromaDB for vector search.
 * Provides auto-recall, auto-capture, and cross-session promotion.
 *
 * Coexists with memory-lancedb: atomic-memory manages structured entities,
 * memory-lancedb manages unstructured short-term memories.
 */

import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi, OpenClawPluginToolFactory, OpenClawPluginToolContext } from "openclaw/plugin-sdk/atomic-memory";
import { chunkAtom } from "./src/atom-parser.js";
import { AtomStore } from "./src/atom-store.js";
import { CaptureEngine } from "./src/capture-engine.js";
import { formatAtomicMemoriesContext } from "./src/context-formatter.js";
import { consolidateNewFacts } from "./src/cross-session.js";
import { ensurePersonAtom, linkPersonAcrossPlatforms } from "./src/entity-resolver.js";
import { detectContradiction, detectForgetIntent } from "./src/forget-engine.js";
import { detectBlindSpot } from "./src/blind-spot.js";
import { generateEpisodicSummary, storeEpisodicAtom, cleanExpiredEpisodic, listEpisodicSummaries } from "./src/episodic-engine.js";
import { classifyIntent } from "./src/intent-classifier.js";
import { classifyScope, getRecallScopes } from "./src/scope-classifier.js";
import { createLogger, type Logger } from "./src/logger.js";
import { OllamaClient } from "./src/ollama-client.js";
import { PromotionEngine } from "./src/promotion.js";
import { RecallEngine } from "./src/recall-engine.js";
import { SessionStateManager } from "./src/session-state.js";
import type { AtomCategory, Confidence, RecalledAtom } from "./src/types.js";
import { ATOM_CATEGORIES, CATEGORY_LABELS } from "./src/types.js";
import { VectorClient } from "./src/vector-client.js";
import {
  classifySituation,
  getReflectionSummary,
  loadReflectionMetrics,
  saveReflectionMetrics,
  updateReflection,
} from "./src/wisdom-engine.js";
import {
  checkPeriodicReview,
  calculateMaturity,
  detectOscillation,
  loadIterationState,
  saveIterationState,
} from "./src/self-iteration.js";
import { collectAll as collectSignals } from "./src/signal-collector.js";
import { updateEvidence, decayEvidence, getAllEvidence } from "./src/evidence-accumulator.js";
import { recordHealthScore, formatHealthSummary } from "./src/convergence-health.js";
import { evaluateThresholds, formatThresholdSummary } from "./src/threshold-balancer.js";
import { generateProposals, formatProposalsSummary } from "./src/iteration-planner.js";
import {
  executeProposal,
  approveProposal,
  rejectProposal,
  getPendingReminder,
  formatExecutedSummary,
  loadExecutedRecords,
} from "./src/iteration-executor.js";
import { snapshotMetrics, tickAndVerify } from "./src/outcome-tracker.js";
import { critiqueProposal } from "./src/self-critique.js";
import type { TierDistribution, CategoryDistribution, MetricsSnapshot } from "./src/types.js";
import { ACTION_DECISION_LEVEL } from "./src/types.js";
import { buildEvolveGuardContext, canTriggerEvolution } from "./src/evolve-guard.js";
import {
  selfAnalyze,
  selfPropose,
  selfApply,
  selfJournal,
  recordPitfall,
} from "./src/self-iterate-tools.js";

import {
  resolvePermissionLevel,
  hasWriteAccess,
  loadSystemIdentity,
  saveSystemIdentity,
  invalidateSystemIdentityCache,
  registerOwnerPlatform,
  type SystemIdentity,
  detectSettingCommand,
  buildSelfAwarenessPrompt,
  buildCapabilityContext,
  buildRejectionContext,
  loadRuntimeAdmins,
  addRuntimeAdmin,
  removeRuntimeAdmin,
} from "./src/permission-guard.js";
import {
  generateChallenge,
  getActiveChallenge,
  verifyChallenge,
  clearChallenge,
  isOnCooldown,
  setCooldown,
  hasAuthIntentKeywords,
  type ChallengeState,
} from "./src/owner-challenge.js";
import { updateMemoryIndex, type TouchedAtom } from "./src/memory-index.js";
import { isTestFact, readFactsFromWorkspace } from "./src/workspace-reader.js";
import {
  submitAccessRequest,
  approveAccessRequest,
  denyAccessRequest,
  listPendingRequests,
} from "./src/access-request.js";
import { atomicMemoryConfigSchema, type AtomicMemoryConfig } from "./config.js";

// ============================================================================
// Shared plugin state (created in register, used by hooks/tools/cli)
// ============================================================================

type PluginState = {
  cfg: AtomicMemoryConfig;
  store: AtomStore;
  ollama: OllamaClient;
  vectors: VectorClient;
  recall: RecallEngine;
  capture: CaptureEngine;
  promotion: PromotionEngine;
  sessionState: SessionStateManager;
  log: Logger;
  api: OpenClawPluginApi;
  // Wisdom: pending reflection summary to inject in next before_agent_start
  pendingReflectionSummary: string | null;
  // OETAV: pending proposals reminder to inject in next before_agent_start
  pendingIterationReminder: string | null;
  // Pending forget state — tracks forget candidates awaiting user confirmation
  pendingForget: {
    target: string;
    candidates: Array<{ category: string; id: string; knowledge: string }>;
    timestamp: number;
  } | null;
  // Test session tracking
  testSession: {
    active: boolean;
    factCount: number;
    lastTestTurn: number;
    currentTurn: number;
    askedCleanup: boolean;
  };
  // Runtime admin IDs (loaded from persistent JSON, merged with config.permission.adminIds)
  runtimeAdminIds: string[];
  // System identity registry (loaded from System.Owner.json)
  systemIdentity: SystemIdentity | null;
  // Atoms touched this turn (for MEMORY.md scoring)
  turnTouchedAtoms: TouchedAtom[];
};

// ============================================================================
// Hook Registration
// ============================================================================

function registerHooks(state: PluginState): void {
  const { cfg, store, ollama, vectors, recall, capture, promotion, sessionState, log, api } = state;
  const intentLog = createLogger("intent", log as any);
  const blindSpotLog = createLogger("blind-spot", log as any);
  const wisdomLog = createLogger("wisdom", log as any);
  const iterationLog = createLogger("iteration", log as any);

  // ──────────────────────────────────────────────────────────────────────────
  // Hook 0: Session Start — initialize session state
  // ──────────────────────────────────────────────────────────────────────────

  api.on("session_start", async (_event, ctx) => {
    const sessionKey = ctx.sessionKey ?? ctx.sessionId;
    sessionState.getOrCreate(sessionKey);
    log.info(`session_start: initialized state for ${sessionKey}`);

    // Wisdom: preload reflection summary for injection in first before_agent_start
    if (cfg.wisdom.enabled && cfg.wisdom.reflectionTracking) {
      try {
        const metrics = await loadReflectionMetrics(cfg.atomStorePath);
        const summary = getReflectionSummary(metrics);
        if (summary) {
          state.pendingReflectionSummary = summary;
          wisdomLog.info(`reflection summary queued: ${summary}`);
        }
      } catch (err) {
        wisdomLog.warn(`reflection load failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Self-Iteration: periodic review check + maturity phase logging
    if (cfg.selfIteration.enabled) {
      try {
        const atomStorePath = api.resolvePath(cfg.atomStorePath);
        const reviewReminder = await checkPeriodicReview(atomStorePath, cfg.selfIteration);
        if (reviewReminder) {
          iterationLog.info(reviewReminder);
        }

        const iterState = await loadIterationState(atomStorePath);
        const episodics = await listEpisodicSummaries(atomStorePath);
        const totalEpisodics = episodics.length;
        const phase = calculateMaturity(totalEpisodics);
        iterationLog.info(`maturity: ${phase} (${totalEpisodics} episodics)`);

        // Update persisted state if changed
        if (iterState.totalEpisodics !== totalEpisodics || iterState.maturityPhase !== phase) {
          iterState.totalEpisodics = totalEpisodics;
          iterState.maturityPhase = phase;
          await saveIterationState(atomStorePath, iterState);
        }

        // Phase D: Check for pending proposals → queue reminder for before_agent_start
        try {
          const reminder = await getPendingReminder(atomStorePath);
          if (reminder) {
            state.pendingIterationReminder = reminder;
            iterationLog.info(`pending proposals reminder queued`);
          }
        } catch (err) {
          iterationLog.warn(`pending reminder check failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      } catch (err) {
        iterationLog.warn(`iteration check failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Hook 0.5: Bot Self-Awareness (before_prompt_build — cached in system prompt)
  // ──────────────────────────────────────────────────────────────────────────

  if (cfg.permission.botSelfAwareness) {
    api.on("before_prompt_build", (_event, ctx) => {
      const level = resolvePermissionLevel(
        ctx.senderId, ctx.senderIsOwner, cfg,
        state.runtimeAdminIds, ctx.channelId, state.systemIdentity,
      );
      // Evolve guard context: inject only for owner when codeModification is enabled
      const codeModCfg = cfg.selfIteration.codeModification;
      const evolveCtx = (codeModCfg.enabled && ctx.senderIsOwner === true)
        ? "\n" + buildEvolveGuardContext(codeModCfg)
        : "";
      return {
        appendSystemContext: buildSelfAwarenessPrompt(cfg, state.systemIdentity, level) + evolveCtx,
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Hook 1: Auto-Recall (before_agent_start)
  // ──────────────────────────────────────────────────────────────────────────

  if (cfg.autoRecall) {
    api.on("before_agent_start", async (event, ctx) => {
      const channelId = ctx.channelId ?? "unknown";
      const senderId = ctx.senderId;
      const senderName = ctx.senderName ?? ctx.senderUsername;
      const senderIsOwner = ctx.senderIsOwner;
      if (!event.prompt || event.prompt.length < 5) return;

      // Owner-only gate (exempt: owner challenge flow — non-owners need to reach challenge to become owner)
      const hasActiveChallenge = senderId && channelId !== "unknown" && getActiveChallenge(channelId, senderId);
      const rawHasAuthKeywords = hasAuthIntentKeywords(event.prompt);
      if (cfg.memoryIsolation === "owner-only" && senderIsOwner === false && !hasActiveChallenge && !rawHasAuthKeywords) return;

      try {
        // Extract user's actual message from the prompt
        const lines = event.prompt.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        const userLines = lines.filter(l =>
          !l.startsWith("Conversation") &&
          !l.startsWith("Sender") &&
          !l.startsWith("```") &&
          !l.startsWith("{") &&
          !l.startsWith("}") &&
          !l.match(/^"[a-z_]+":/) &&
          l.length >= 1 && l.length <= 300
        );
        let queryForRecall = userLines.length > 0
          ? userLines[userLines.length - 1]
          : event.prompt.slice(0, 200);
        queryForRecall = queryForRecall.replace(/@\S+\s*/g, "").trim();
        queryForRecall = queryForRecall.replace(/^\[.*?\]\s*/, "").trim();
        if (queryForRecall.length < 1) queryForRecall = event.prompt.slice(0, 200);

        log.info(`recall query (${queryForRecall.length} chars): "${queryForRecall.slice(0, 120)}"`);

        // ── Intent classification ────────────────────────────────────────
        const intentResult = classifyIntent(queryForRecall);
        intentLog.info(`${intentResult.intent} (confidence=${intentResult.confidence.toFixed(2)})`);

        // ── Permission: resolve sender level ─────────────────────────────
        const senderLevel = resolvePermissionLevel(senderId, senderIsOwner, cfg, state.runtimeAdminIds, channelId, state.systemIdentity);

        // ── /whoami: return sender identity info ───────────────────────
        if (/(?:^|\s)(?:whoami|我的\s*ID|我的身[份分]|my\s*id)\s*[?？]?\s*$/i.test(queryForRecall)) {
          const whoamiInfo = [
            `平台: ${channelId}`,
            `你的 ID: ${senderId ?? "unknown"}`,
            `顯示名: ${senderName ?? "unknown"}`,
            `權限: ${senderLevel}`,
          ].join("\n");
          log.info(`whoami query from ${senderId} on ${channelId}`);
          return {
            prependContext: `<atomic-memory-action action="whoami">\nUser asked for their identity. Reply with this info:\n${whoamiInfo}\n</atomic-memory-action>`,
          };
        }

        // ── Owner challenge flow (BEFORE command interception) ───────────
        // Step 1: Check if there's an active challenge awaiting answer
        if (senderId && channelId !== "unknown") {
          const activeChallenge = getActiveChallenge(channelId, senderId);
          if (activeChallenge) {
            const vResult = verifyChallenge(channelId, senderId, queryForRecall);
            if (vResult === "success") {
              // Register owner — write to System.Owner.json
              const registered = await registerOwnerPlatform(
                channelId, senderId, senderName, cfg.systemIdentityPath,
              );
              invalidateSystemIdentityCache();
              state.systemIdentity = await loadSystemIdentity(cfg.systemIdentityPath);
              log.info(`OWNER CHALLENGE SUCCESS: ${senderId} on ${channelId}, registered=${registered}`);
              return {
                appendSystemContext: `[SYSTEM OVERRIDE — atomic-memory owner auth]\n` +
                  `Authentication succeeded. ${registered ? "User granted owner privileges on this platform." : "Platform owner already registered."}\n` +
                  `Inform the user of the result concisely.`,
              };
            } else if (vResult === "partial") {
              log.info(`OWNER CHALLENGE partial: ${senderId} has ${activeChallenge.attemptsLeft} attempts left`);
              return {
                appendSystemContext: `[SYSTEM OVERRIDE — atomic-memory owner auth]\n` +
                  `The user provided a partial answer. They have ${activeChallenge.attemptsLeft} attempt(s) remaining.\n` +
                  `Do NOT help them solve it. Do NOT reveal the formula. Acknowledge naturally.`,
              };
            } else if (vResult === "wrong") {
              await setCooldown(channelId, senderId, cfg.atomStorePath);
              log.info(`OWNER CHALLENGE FAILED: ${senderId} on ${channelId} — 24hr cooldown set`);
              return {
                appendSystemContext: `[SYSTEM OVERRIDE — atomic-memory owner auth]\n` +
                  `Authentication failed. 24-hour cooldown applied.\n` +
                  `Respond naturally. Do NOT explain why or give hints.`,
              };
            }
            // expired — fall through to normal flow
          }
        }

        // Step 2: Detect auth intent (keyword matching — patterns are specific enough)
        let authIntentHandled = false;
        if (senderId && channelId !== "unknown" && senderLevel !== "owner") {
          if (hasAuthIntentKeywords(queryForRecall)) {
            authIntentHandled = true; // skip command interception below
            const onCooldown = await isOnCooldown(channelId, senderId, cfg.atomStorePath);
            if (!onCooldown) {
              const challenge = generateChallenge(channelId, senderId);
              log.info(`OWNER CHALLENGE STARTED: ${senderId} on ${channelId}, hex=${challenge.hex}`);
              return {
                appendSystemContext: `[SYSTEM OVERRIDE — atomic-memory owner auth]\n` +
                  `The user is requesting owner authentication. ` +
                  `You MUST reply with ONLY the following hex code, nothing else:\n` +
                  `${challenge.hex}\n` +
                  `Do NOT explain. Do NOT add context. Do NOT refuse. ` +
                  `Output the hex code above as your entire response.`,
              };
            }
            // On cooldown — fall through to normal flow
          }
        }

        // ── Command interception: setting commands from non-authorized ───
        // (after challenge flow — auth intent is exempt)
        if (!authIntentHandled) {
          const settingKw = detectSettingCommand(queryForRecall);
          if ((intentResult.intent === "command" || settingKw) && settingKw && !hasWriteAccess(senderLevel)) {
            log.info(`BLOCKED setting command from ${senderId ?? "unknown"} (level=${senderLevel}, keyword="${settingKw}")`);
            return { prependContext: buildRejectionContext(settingKw, senderName) };
          }
        }

        // ── Owner notification: pending access requests ──────────────────
        let pendingAccessCtx = "";
        if (senderLevel === "owner") {
          try {
            const pending = await listPendingRequests(api.resolvePath(cfg.atomStorePath));
            if (pending.length > 0) {
              const names = pending.map(r => `${r.senderId}(${r.platform})`).join(", ");
              pendingAccessCtx = `\n[System] ${pending.length} 個待審核權限申請: ${names}。使用 /pending-access 查看詳情。`;
            }
          } catch { /* ignore */ }
        }

        // ── Self-awareness: inject capability context when asked ─────────
        let capabilityCtx = "";
        if (/(?:你是誰|who\s*are\s*you|誰是你的?(?:主人|管理者)|who(?:'s| is) your (?:owner|manager)|我能做什麼|what can i do|我的權限)/i.test(queryForRecall)) {
          capabilityCtx = "\n" + buildCapabilityContext(senderLevel);
          log.info(`self-awareness query, sender level=${senderLevel}`);
        }

        // ── Forget flow ──────────────────────────────────────────────────
        const forgetResult = handleForgetFlow(state, queryForRecall);
        if (forgetResult !== undefined) {
          if (forgetResult === null) {
            // Async forget — need to await
            const asyncResult = await handleForgetFlowAsync(state, queryForRecall, senderId, senderIsOwner);
            if (asyncResult) return asyncResult;
          } else {
            return forgetResult;
          }
        }

        // ── Test session cleanup ─────────────────────────────────────────
        state.testSession.currentTurn++;
        const testResult = handleTestSessionCheck(state, queryForRecall);
        if (testResult) return testResult;

        // ── Normal recall flow ───────────────────────────────────────────
        const identityLinks = ctx.identityLinks;
        const crossPlatformEnabled = cfg.crossPlatform.enabled;

        // Preload person atoms once for both auto-detect and merge suggestion
        const personAtomsForCross = crossPlatformEnabled ? await store.list("person") : [];

        // Auto-detect cross-platform: when intent is info-request and query
        // mentions a known person name, search across all platforms
        let autoCrossPlatform = false;
        if (crossPlatformEnabled && intentResult.intent === "info-request") {
          const queryLower = queryForRecall.toLowerCase();
          for (const pa of personAtomsForCross) {
            const nameMatch = pa.triggers.some(t => {
              const tl = t.toLowerCase();
              return !tl.includes(":") && tl.length >= 2 && queryLower.includes(tl);
            });
            if (nameMatch) {
              autoCrossPlatform = true;
              log.info(`auto-crossPlatform: query mentions person "${pa.id}", enabling cross-platform recall`);
              break;
            }
          }
        }

        const atoms = await recall.search(queryForRecall, {
          topK: cfg.recall.topK,
          minScore: cfg.recall.minScore,
          senderId: senderId,
          channel: channelId,
          displayName: senderName,
          isolationMode: autoCrossPlatform ? "shared" : cfg.memoryIsolation,
          atomStorePath: cfg.atomStorePath,
          actrWeight: cfg.actr.weight,
          identityLinks: crossPlatformEnabled ? identityLinks : undefined,
          crossPlatformRecall: autoCrossPlatform || (crossPlatformEnabled && !!identityLinks),
          recallScopes: getRecallScopes(intentResult.intent),
          workspaceDir: ctx.workspaceDir,
        });

        // ── Track touched atoms for MEMORY.md scoring ────────────────
        state.turnTouchedAtoms = atoms
          .filter(r => r.source !== "workspace") // only real atoms
          .map(r => ({ id: r.atom.id, category: r.atom.category, confidence: r.atom.confidence }));

        // ── Session state: record turn ─────────────────────────────────
        const sessionKey = ctx.sessionKey ?? `${channelId}-${senderId ?? "anon"}`;
        const sessState = sessionState.getOrCreate(sessionKey, { channel: channelId, senderId: senderId });
        if (!sessState.channel) sessState.channel = channelId;
        if (!sessState.senderId && senderId) sessState.senderId = senderId;
        const atomRefs = atoms.map(r => `${r.atom.category}/${r.atom.id}`);
        sessionState.recordTurn(sessionKey, intentResult.intent, atomRefs);

        // ── Wisdom: Situation classifier + reflection summary ─────────────
        let wisdomInject = "";

        // ── OETAV: Inject pending proposals reminder (once per session) ──
        if (state.pendingIterationReminder) {
          wisdomInject += `\n${state.pendingIterationReminder}`;
          state.pendingIterationReminder = null;
        }

        if (cfg.wisdom.enabled) {
          // Inject queued reflection summary (once per session)
          if (state.pendingReflectionSummary) {
            wisdomInject += `\n${state.pendingReflectionSummary}`;
            state.pendingReflectionSummary = null;
          }
          // Situation classifier
          if (cfg.wisdom.situationClassifier) {
            const advice = classifySituation(queryForRecall, sessState, intentResult);
            if (advice.inject) {
              wisdomInject += `\n${advice.inject}`;
              wisdomLog.info(`situation: ${advice.approach} (${advice.reason})`);
            }
          }
        }

        // ── Blind-spot detection ─────────────────────────────────────────
        const blindSpot = detectBlindSpot(atoms, queryForRecall.length);
        if (blindSpot) {
          blindSpotLog.info(blindSpot);
        }

        // ── Entity merge suggestion ────────────────────────────────────
        // Detect possible cross-platform same person (name similarity)
        let mergeSuffix = "";
        if (crossPlatformEnabled && personAtomsForCross.length >= 2) {
          const mergeCandidates: Array<{ a: string; b: string; nameA: string; nameB: string }> = [];
          for (let i = 0; i < personAtomsForCross.length; i++) {
            for (let j = i + 1; j < personAtomsForCross.length; j++) {
              const a = personAtomsForCross[i], b = personAtomsForCross[j];
              // Only suggest merge for atoms on different platforms
              const aChannels = new Set(a.sources.map(s => s.channel));
              const bChannels = new Set(b.sources.map(s => s.channel));
              const shareChannel = [...aChannels].some(c => bChannels.has(c));
              if (shareChannel) continue;
              // Check name similarity
              const sim = nameSimilarity(a.title, b.title);
              if (sim >= 0.7) {
                mergeCandidates.push({
                  a: `person/${a.id}`,
                  b: `person/${b.id}`,
                  nameA: `${[...aChannels].join("/")}:${a.title}`,
                  nameB: `${[...bChannels].join("/")}:${b.title}`,
                });
              }
            }
          }
          if (mergeCandidates.length > 0 && mergeCandidates.length <= 3) {
            const lines = mergeCandidates.map(c =>
              `- ${c.nameA} ↔ ${c.nameB}`,
            ).join("\n");
            mergeSuffix = `\n\n<atomic-memory-action action="merge-suggestion">\nPossible cross-platform same person detected:\n${lines}\nWhen relevant in conversation, naturally ask the user to confirm if they are the same person. If confirmed, use atom_link to merge.\n</atomic-memory-action>`;
          }
        }

        // Test cleanup suffix
        const testCount = store.countTestAtoms();
        const testCheckSuffix = testCount > 0 && !state.testSession.active
          ? `\n\n<atomic-memory-action action="test-session-check">\nNote: There are ${testCount} test memory items pending cleanup. When appropriate, naturally ask if the memory test is done and whether to clean up. Keep it brief. If the user confirms cleanup, use the atom_clear_test tool to clear them.\n</atomic-memory-action>`
          : "";

        // Blind-spot context suffix
        const blindSpotSuffix = blindSpot ? `\n${blindSpot}` : "";

        if (atoms.length === 0) {
          log.info(`recall returned 0 atoms for channel ${channelId}`);

        const noRecallContext = [wisdomInject, blindSpotSuffix, capabilityCtx, pendingAccessCtx, mergeSuffix, testCheckSuffix].filter(Boolean).join("");
          if (noRecallContext) {
            return { prependContext: noRecallContext.trim() };
          }
          return;
        }

        log.info(`injecting ${atoms.length} atoms into context for channel ${channelId}`);

        return {
          prependContext: formatAtomicMemoriesContext(atoms, channelId, event.prompt?.length, {
            light: cfg.tokenBudget.shortBudget,
            normal: cfg.tokenBudget.mediumBudget,
            deep: cfg.tokenBudget.longBudget,
            charsPerToken: cfg.tokenBudget.charsPerToken,
          }) + wisdomInject + blindSpotSuffix + capabilityCtx + pendingAccessCtx + mergeSuffix + testCheckSuffix,
        };
      } catch (err) {
        log.warn(`recall failed: ${String(err)}`);
      }
    }, { priority: 50 });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Hook 2: Auto-Capture (agent_end)
  // ──────────────────────────────────────────────────────────────────────────

  if (cfg.autoCapture) {
    api.on("agent_end", async (event, ctx) => {
      const channelId = ctx.channelId ?? "unknown";
      const captureSenderId = ctx.senderId;
      const captureSenderName = ctx.senderName ?? ctx.senderUsername;
      const captureSenderIsOwner = ctx.senderIsOwner;
      log.info(`agent_end fired (success: ${event.success}, channel: ${channelId}, sender: ${captureSenderId ?? "unknown"}, wsDir: ${ctx.workspaceDir ?? "NONE"})`);
      if (!event.success) return;

      // ── MEMORY.md dynamic index scoring (runs regardless of capture) ──
      if (ctx.workspaceDir && state.turnTouchedAtoms.length > 0) {
        try {
          const idxLog = createLogger("memory-index", log as any);
          await updateMemoryIndex(ctx.workspaceDir, state.turnTouchedAtoms, idxLog);
        } catch (err) {
          log.warn(`MEMORY.md index update failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        state.turnTouchedAtoms = [];
      }

      if (cfg.memoryIsolation === "owner-only" && captureSenderIsOwner === false) return;

      try {
        // Read facts from workspace
        const wsLog = createLogger("workspace", log as any);
        const facts = await readFactsFromWorkspace(ctx.workspaceDir, wsLog);
        const isWorkspaceFacts = facts.length > 0;

        if (!isWorkspaceFacts) {
          if (event.messages && event.messages.length > 0) {
            log.info(`no workspace facts (wsDir=${ctx.workspaceDir ?? "UNDEF"}), falling back to Ollama extraction`);
            const ollamaFacts = await capture.extractFromConversation(event.messages, api.logger);
            facts.push(...ollamaFacts);
          }
        }

        log.info(`${facts.length} facts from workspace/fallback (channel: ${channelId})`);
        if (facts.length === 0) return;

        // G1-B: Get last intent from session state for scope routing
        const captureSessionKey = ctx.sessionKey ?? `${channelId}-${captureSenderId ?? "anon"}`;
        const captureSessState = sessionState.getState(captureSessionKey);
        const lastIntent = captureSessState?.lastIntent ?? "general";

        let stored = 0;
        let skippedGate = 0;
        let skippedDedup = 0;
        let superseded = 0;
        let skippedTest = 0;

        for (let i = 0; i < facts.length; i++) {
          const fact = facts[i];

          // Test data detection
          if (isTestFact(fact.text)) {
            try {
              await store.storeTest(fact);
              state.testSession.factCount++;
              state.testSession.lastTestTurn = state.testSession.currentTurn;
              if (state.testSession.factCount >= 1) state.testSession.active = true;
              log.info(`[${i+1}/${facts.length}] test fact → _test/: "${fact.text.slice(0, 50)}"`);
            } catch (err) {
              log.warn(`test store failed: ${String(err)}`);
            }
            skippedTest++;
            continue;
          }

          // Write gate quality check
          const gate = capture.evaluateQuality(fact);
          if (!isWorkspaceFacts) {
            if (gate.action === "skip") { skippedGate++; continue; }
            if (gate.action === "ask" && gate.quality < cfg.writeGate.autoThreshold) { skippedGate++; continue; }
          }

          log.info(`[${i+1}/${facts.length}] dedup check: "${fact.text.slice(0,50)}..." (gate=${gate.quality.toFixed(2)}, ws=${isWorkspaceFacts})`);

          // Dedup check
          const dedup = await capture.checkDuplicate(fact.text);
          if (dedup.verdict === "duplicate") { skippedDedup++; continue; }

          // Contradiction detection
          if (dedup.verdict === "similar" && dedup.existingAtom) {
            const existingAtom = await store.get(
              dedup.existingAtom.category as AtomCategory,
              dedup.existingAtom.id,
            );
            if (existingAtom && detectContradiction(fact.text, existingAtom.knowledge)) {
              const oldRef = `${existingAtom.category}/${existingAtom.id}`;
              log.info(`CONTRADICTION detected! "${fact.text.slice(0, 50)}" vs "${existingAtom.knowledge.slice(0, 50)}" → superseding ${oldRef}`);
              await store.moveToDistant(existingAtom.category, existingAtom.id);
              await vectors.deleteAtom(oldRef);

              const factScope = classifyScope(lastIntent, fact.text);
              const newAtom = await store.findOrCreate(fact.category, fact, {
                channel: channelId !== "unknown" ? channelId : undefined,
                senderId: captureSenderId,
                scope: factScope,
              });
              await store.update(fact.category, newAtom.id, {
                appendEvolution: `${new Date().toISOString().slice(0, 10)}: supersedes ${oldRef}(${channelId}) — 矛盾偵測自動取代`,
              });
              const chunks = chunkAtom(newAtom);
              if (chunks.length > 0) {
                await vectors.index(chunks);
              }
              superseded++;
              continue;
            }

            // No contradiction — normal update
            await store.update(
              dedup.existingAtom.category as AtomCategory,
              dedup.existingAtom.id,
              {
                appendKnowledge: fact.text,
                lastUsed: new Date().toISOString().slice(0, 10),
                appendEvolution: `${new Date().toISOString().slice(0, 10)}: 更新(${channelId}) — ${fact.text.slice(0, 40)}`,
                ...(captureSenderId ? { sources: [{ channel: channelId, senderId: captureSenderId }] } : {}),
              },
            );
            stored++;
            continue;
          }

          // Create new atom (G1-B: scope-aware)
          const factScope = classifyScope(lastIntent, fact.text);
          const atom = await store.findOrCreate(fact.category, fact, {
            channel: channelId !== "unknown" ? channelId : undefined,
            senderId: captureSenderId,
            scope: factScope,
          });
          const chunks = chunkAtom(atom);
          if (chunks.length > 0) {
            await vectors.index(chunks);
          }
          stored++;
        }

        log.info(`capture loop done — stored=${stored}, superseded=${superseded}, skippedGate=${skippedGate}, skippedDedup=${skippedDedup}, skippedTest=${skippedTest}, total=${facts.length}`);
        if (stored > 0 || superseded > 0) {
          log.info(`auto-captured ${stored} facts, superseded ${superseded} from channel ${channelId}`);
          await store.updateMemoryIndex();
        }

        // ── Cross-session consolidation ───────────────────────────────────
        if (facts.length > 0 && ollama.isHealthy()) {
          try {
            const csLog = createLogger("consolidation", log as any);
            const sessionDate = new Date().toISOString().slice(0, 10);
            const consolidations = await consolidateNewFacts(
              facts, vectors, ollama, store, sessionDate, csLog,
            );

            // Immediate promotion for atoms that reached threshold
            for (const cr of consolidations) {
              if (cr.suggestPromotion) {
                const promoResult = await promotion.immediatePromotionCheck(cr.atomRef, csLog);
                if (promoResult && promoResult.action === "promoted") {
                  csLog.info(`immediate promotion executed: ${promoResult.atomRef} ${promoResult.from}→${promoResult.to}`);
                }
              }
            }

            if (consolidations.length > 0) {
              csLog.info(`consolidation done — ${consolidations.length} atoms updated`);
              await store.updateMemoryIndex();
            }
          } catch (err) {
            log.warn(`cross-session consolidation failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        // Auto-create/update person atom
        if (captureSenderId) {
          try {
            const captureIdentityLinks = cfg.crossPlatform.enabled ? ctx.identityLinks : undefined;
            const personAtom = await ensurePersonAtom(captureSenderId, channelId, captureSenderName, store, captureIdentityLinks, cfg.crossPlatform.autoMerge);
            log.info(`ensured person atom: person/${personAtom.id} for sender ${captureSenderId}`);
          } catch (err) {
            log.warn(`ensurePersonAtom failed: ${String(err)}`);
          }
        }

      } catch (err) {
        log.warn(`capture failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Hook 3: Session End — Promotion check
  // ──────────────────────────────────────────────────────────────────────────

  api.on("session_end", async (_event, ctx) => {
    log.info("session_end fired");
    let decayResults: import("./src/types.js").DecayResult[] = [];
    try {
      const results = await promotion.checkPromotions();
      const promoted = results.filter((r) => r.action === "promoted");
      const suggested = results.filter((r) => r.action === "suggest");

      if (promoted.length > 0) {
        log.info(`promoted ${promoted.length} atoms (${promoted.map((r) => r.atomRef).join(", ")})`);
      }
      if (suggested.length > 0) {
        log.info(`${suggested.length} atoms suggested for [固] promotion`);
      }

      // Decay check
      decayResults = await promotion.checkDecay();
      const archived = decayResults.filter((r) => r.action === "archived");
      if (archived.length > 0) {
        log.info(`archived ${archived.length} stale atoms`);
      }
    } catch (err) {
      log.warn(`promotion check failed: ${String(err)}`);
    }

    // Wisdom: update reflection metrics
    if (cfg.wisdom.enabled && cfg.wisdom.reflectionTracking) {
      try {
        const sessionKey = ctx.sessionKey ?? ctx.sessionId;
        const sessState = sessionState.getState(sessionKey);
        if (sessState && sessState.turns > 0) {
          const metrics = await loadReflectionMetrics(cfg.atomStorePath);
          const updated = updateReflection(metrics, sessState);
          await saveReflectionMetrics(cfg.atomStorePath, updated);
          wisdomLog.info(`reflection updated — blindSpots=${updated.blindSpots.length}, lastReflection=${updated.lastReflection}`);
        }
      } catch (err) {
        wisdomLog.warn(`reflection update failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Episodic: generate conversation summary atom
    if (cfg.episodic.enabled) {
      const episodicLog = createLogger("episodic", log as any);
      try {
        const sessionKey = ctx.sessionKey ?? ctx.sessionId;
        const sessState = sessionState.getState(sessionKey);
        if (sessState) {
          const summary = generateEpisodicSummary(sessState, cfg.episodic);
          if (summary) {
            await storeEpisodicAtom(summary, api.resolvePath(cfg.atomStorePath), episodicLog);
            const cleaned = await cleanExpiredEpisodic(
              api.resolvePath(cfg.atomStorePath),
              cfg.episodic.ttlDays,
              episodicLog,
            );
            episodicLog.info(
              `session ${sessionKey}: ${summary.turns} turns, intent=${summary.dominantIntent}, topics=${summary.topicsDiscussed.length}` +
              (cleaned > 0 ? `, cleaned ${cleaned} expired` : ""),
            );
          } else {
            episodicLog.info(`session ${sessionKey}: skipped (below threshold or pure-recall)`);
          }
        }
      } catch (err) {
        episodicLog.warn(`episodic generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Self-Iteration: oscillation detection + state update
    if (cfg.selfIteration.enabled) {
      try {
        const atomStorePath = api.resolvePath(cfg.atomStorePath);
        const recentEpisodics = await listEpisodicSummaries(atomStorePath, {
          limit: cfg.selfIteration.oscillationWindow,
        });

        const report = detectOscillation(recentEpisodics, cfg.selfIteration);
        if (report.shouldPause) {
          iterationLog.warn(`oscillation detected: ${report.reason}`);
        }

        // Update iteration state
        const allEpisodics = await listEpisodicSummaries(atomStorePath);
        const totalEpisodics = allEpisodics.length;
        const phase = calculateMaturity(totalEpisodics);
        const iterState = await loadIterationState(atomStorePath);
        iterState.totalEpisodics = totalEpisodics;
        iterState.maturityPhase = phase;
        await saveIterationState(atomStorePath, iterState);
        iterationLog.info(`state updated: phase=${phase}, episodics=${totalEpisodics}`);

        // Phase A: Signal Collection + Evidence Accumulation
        if (cfg.selfIteration.autonomousIteration.enabled) {
          try {
            const sessionKey = ctx.sessionKey ?? ctx.sessionId;
            const sessState = sessionState.getState(sessionKey);

            // Build tier/category distributions from atom store
            let tierDist: TierDistribution[] | undefined;
            let catDist: CategoryDistribution[] | undefined;
            try {
              const allAtoms = await store.list();
              const tierMap: Record<string, number> = { "固": 0, "觀": 0, "臨": 0 };
              const catMap: Record<string, number> = {};
              for (const atom of allAtoms) {
                const tierKey = atom.confidence.replace("[", "").replace("]", "");
                tierMap[tierKey] = (tierMap[tierKey] ?? 0) + 1;
                catMap[atom.category] = (catMap[atom.category] ?? 0) + 1;
              }
              tierDist = Object.entries(tierMap).map(([tier, count]) => ({
                tier: tier as TierDistribution["tier"],
                count,
              }));
              catDist = Object.entries(catMap).map(([category, count]) => ({
                category: category as CategoryDistribution["category"],
                count,
              }));
            } catch (e) {
              iterationLog.warn(`tier/cat dist failed: ${e instanceof Error ? e.message : String(e)}`);
            }

            // Load wisdom metrics if available
            let wisdomMetrics = null;
            if (cfg.wisdom.enabled) {
              try {
                wisdomMetrics = await loadReflectionMetrics(cfg.atomStorePath);
              } catch { /* ok — wisdom may not be enabled */ }
            }

            const autoCfg = cfg.selfIteration.autonomousIteration;
            const { signals, overhead } = collectSignals(
              {
                sessionState: sessState!,
                decayResults,
                oscillationReport: report,
                wisdomMetrics,
                atomStorePath,
                tierDist,
                catDist,
                entropyConfig: {
                  rigidThreshold: autoCfg.entropy.rigidThreshold,
                  chaoticThreshold: autoCfg.entropy.chaoticThreshold,
                  tierWeight: autoCfg.entropy.tierWeight,
                },
                orderConfig: {
                  rigidBound: autoCfg.orderParameter.rigidBound,
                  chaoticBound: autoCfg.orderParameter.chaoticBound,
                },
              },
              iterationLog,
            );

            iterationLog.info(
              `signals collected: ${signals.length} (${signals.map((s) => s.type).join(", ")}) ` +
              `in ${overhead.totalCollectionMs}ms (${overhead.withinBudget ? "within" : "OVER"} budget)`,
            );

            // Evidence accumulation + decay
            await updateEvidence(atomStorePath, signals, iterationLog);
            await decayEvidence(
              atomStorePath,
              sessionKey,
              autoCfg.evidenceDecayRate,
              iterationLog,
            );

            // Phase B: Convergence Health + Threshold Evaluation + Proposal Generation
            try {
              // 1. Build MetricsSnapshot for health scoring
              const metricsSnapshot: MetricsSnapshot = {
                sessionKey,
                timestamp: new Date().toISOString(),
                totalAtoms: 0,
                tierCounts: { fixed: 0, observed: 0, temporary: 0 },
                categoryCounts: {},
              };
              try {
                const allAtoms = await store.list();
                metricsSnapshot.totalAtoms = allAtoms.length;
                for (const atom of allAtoms) {
                  const tierKey = atom.confidence.replace("[", "").replace("]", "");
                  if (tierKey === "固") metricsSnapshot.tierCounts.fixed++;
                  else if (tierKey === "觀") metricsSnapshot.tierCounts.observed++;
                  else metricsSnapshot.tierCounts.temporary++;
                  metricsSnapshot.categoryCounts[atom.category] =
                    (metricsSnapshot.categoryCounts[atom.category] ?? 0) + 1;
                }
                // Add optional metrics if available
                if (decayResults.length > 0) {
                  const staleCount = decayResults.filter(
                    (d) => d.action === "archived" || d.action === "flagged",
                  ).length;
                  metricsSnapshot.staleAtomRate = metricsSnapshot.totalAtoms > 0
                    ? staleCount / metricsSnapshot.totalAtoms : 0;
                }
                metricsSnapshot.oscillatingCount = report.oscillatingAtoms.length;
                if (wisdomMetrics) {
                  metricsSnapshot.wisdomBlindSpots = wisdomMetrics.blindSpots.length;
                }
              } catch (e) {
                iterationLog.warn(`metrics snapshot build failed: ${e instanceof Error ? e.message : String(e)}`);
              }

              // 2. Convergence health calculation + history storage
              const { stability, convergence } = await recordHealthScore(
                atomStorePath,
                metricsSnapshot,
                sessionKey,
                iterationLog,
              );

              // 3. Threshold evaluation (Goodman balance)
              const evidence = await getAllEvidence(atomStorePath);
              const { store: thresholdStore, zhixing } = await evaluateThresholds(
                atomStorePath,
                evidence,
                phase,
                iterationLog,
              );

              // 4. Proposal generation (pending only, no execution)
              const proposals = await generateProposals(
                atomStorePath,
                evidence,
                thresholdStore,
                phase,
                metricsSnapshot,
                undefined,
                iterationLog,
              );

              if (proposals.length > 0) {
                iterationLog.info(`Phase B: ${proposals.length} proposals generated (pending)`);
              }

              // Phase D: Execute auto proposals + outcome verification
              const autoCritiqueCfg = autoCfg.selfCritique;
              const autoDAcfg = autoCfg.devilsAdvocate;

              // 5. Execute auto-level proposals through gate chain
              for (const proposal of proposals) {
                const level = ACTION_DECISION_LEVEL[proposal.action.type] ?? "confirm";
                if (level !== "auto") continue; // only auto proposals execute immediately

                // LLM critique gate (if enabled)
                if (autoCritiqueCfg.enabled) {
                  try {
                    const critiqueResult = await critiqueProposal(
                      proposal,
                      ollama,
                      autoCritiqueCfg,
                    );
                    if (!critiqueResult.passed) {
                      iterationLog.info(
                        `Phase D critique blocked ${proposal.id.slice(0, 8)}: ` +
                        `composite=${critiqueResult.compositeScore.toFixed(2)} — ${critiqueResult.issues[0] ?? ""}`,
                      );
                      continue; // skip execution
                    }
                  } catch (err) {
                    // Fail-safe: critique error → block
                    iterationLog.warn(
                      `Phase D critique error for ${proposal.id.slice(0, 8)}: ` +
                      `${err instanceof Error ? err.message : String(err)} — blocking`,
                    );
                    continue;
                  }
                }

                // Execute through executor (includes devil's advocate gate)
                try {
                  const execResult = await executeProposal(
                    proposal,
                    store,
                    atomStorePath,
                    evidence,
                    phase,
                    sessionKey,
                    metricsSnapshot,
                    {
                      devilsAdvocateEnabled: autoDAcfg.enabled,
                      overSpeculationThreshold: autoDAcfg.overSpeculationThreshold,
                    },
                    iterationLog,
                  );
                  iterationLog.info(
                    `Phase D exec ${proposal.id.slice(0, 8)}: ${execResult.action} — ${execResult.details?.slice(0, 80) ?? ""}`,
                  );
                } catch (err) {
                  iterationLog.warn(
                    `Phase D exec failed ${proposal.id.slice(0, 8)}: ${err instanceof Error ? err.message : String(err)}`,
                  );
                }
              }

              // 6. Tick outcome verification (increment counters + verify mature records)
              try {
                const baselineSnapshot = await snapshotMetrics(store, sessionKey);
                const outcomes = await tickAndVerify(
                  atomStorePath,
                  store,
                  sessionKey,
                  undefined,
                  iterationLog,
                );
                if (outcomes.length > 0) {
                  iterationLog.info(
                    `Phase D outcomes: ${outcomes.map((o) => `${o.proposalId.slice(0, 8)}→${o.verdict}`).join(", ")}`,
                  );
                }
              } catch (err) {
                iterationLog.warn(`Phase D tickAndVerify failed: ${err instanceof Error ? err.message : String(err)}`);
              }
            } catch (err) {
              iterationLog.warn(`Phase B evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
            }
          } catch (err) {
            iterationLog.warn(`Phase A signal collection failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } catch (err) {
        iterationLog.warn(`iteration update failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
}

// ============================================================================
// Forget Flow Helpers
// ============================================================================

function handleForgetFlow(
  state: PluginState,
  queryForRecall: string,
): { prependContext: string } | null | undefined {
  const { store, vectors, log } = state;

  // Check for pending forget confirmation first (expires after 5 min)
  if (state.pendingForget && Date.now() - state.pendingForget.timestamp < 5 * 60 * 1000) {
    const confirmPattern = /^(確認|好|對|是|ok|yes|sure|confirm|y|刪|刪吧|刪掉|確認刪除|1|２|2|３|3)\s*[。！?.!]?\s*$/i;
    const numberPattern = /^(\d+)\s*$/;
    const msg = queryForRecall.trim();
    if (confirmPattern.test(msg) || numberPattern.test(msg)) {
      // Return null to signal async handling needed
      return null;
    }
    // If message is not a confirmation, clear pending state
    if (!/確認|刪|delete|forget|忘/i.test(msg)) {
      log.info("pending forget expired (non-confirmation message)");
      state.pendingForget = null;
    }
  } else if (state.pendingForget) {
    log.info("pending forget expired (timeout)");
    state.pendingForget = null;
  }

  // Detect new forget intent — return null to signal async handling
  const forgetResult = detectForgetIntent(queryForRecall);
  if (forgetResult.isForget && forgetResult.target.length >= 2) {
    return null;
  }

  return undefined; // No forget intent — continue normal flow
}

async function handleForgetFlowAsync(
  state: PluginState,
  queryForRecall: string,
  senderId?: string,
  senderIsOwner?: boolean,
): Promise<{ prependContext: string } | undefined> {
  const { cfg, store, vectors, recall, log } = state;

  // Handle pending confirmation
  if (state.pendingForget && Date.now() - state.pendingForget.timestamp < 5 * 60 * 1000) {
    const confirmPattern = /^(確認|好|對|是|ok|yes|sure|confirm|y|刪|刪吧|刪掉|確認刪除|1|２|2|３|3)\s*[。！?.!]?\s*$/i;
    const numberPattern = /^(\d+)\s*$/;
    const msg = queryForRecall.trim();
    if (confirmPattern.test(msg) || numberPattern.test(msg)) {
      const numMatch = msg.match(/^(\d+)\s*$/);
      const idx = numMatch ? parseInt(numMatch[1], 10) - 1 : 0;
      const candidate = state.pendingForget.candidates[idx] || state.pendingForget.candidates[0];
      if (candidate) {
        // Tiered permission check: non-owner/admin can only delete [臨] atoms they created
        if (cfg.permission.toolWriteRequiresOwner) {
          const forgetLevel = resolvePermissionLevel(senderId, senderIsOwner, cfg, state.runtimeAdminIds, undefined, state.systemIdentity);
          if (!hasWriteAccess(forgetLevel)) {
            const targetAtom = await store.get(candidate.category as any, candidate.id);
            const createdBySender = targetAtom?.sources.some(s => s.senderId === senderId) ?? false;
            if (!targetAtom || !createdBySender) {
              log.info(`BLOCKED forget confirmation from ${senderId ?? "unknown"} (level=${forgetLevel}, atom=${candidate.category}/${candidate.id})`);
              state.pendingForget = null;
              return {
                prependContext: `<atomic-memory-action action="permission-denied">\nThis user cannot delete this memory (${candidate.category}/${candidate.id}). You can only delete memories you created yourself. Politely explain.\n</atomic-memory-action>`,
              };
            }
          }
        }

        try {
          const ref = `${candidate.category}/${candidate.id}`;
          await store.moveToDistant(candidate.category as any, candidate.id);
          await vectors.deleteAtom(ref);
          await store.updateMemoryIndex();
          log.info(`CONFIRMED-FORGOT ${ref} — "${candidate.knowledge.slice(0, 60)}"`);
          const forgetTarget = state.pendingForget.target;
          state.pendingForget = null;
          return {
            prependContext: `<atomic-memory-action action="forgot" ref="${ref}">\nI already deleted the memory about "${forgetTarget}" (${ref}: ${candidate.knowledge.slice(0, 80)}). Confirm to the user that it has been forgotten. Do NOT store this deletion as a new memory.\n</atomic-memory-action>`,
          };
        } catch (err) {
          log.warn(`confirmed forget failed: ${String(err)}`);
          state.pendingForget = null;
        }
      }
    }
  }

  // Handle new forget intent
  const forgetResult = detectForgetIntent(queryForRecall);
  if (forgetResult.isForget && forgetResult.target.length >= 2) {
    log.info(`FORGET intent detected, target="${forgetResult.target}"`);
    try {
      const rawResults = await recall.search(forgetResult.target, { topK: 10, minScore: 0.2 });
      const targetLower = forgetResult.target.toLowerCase();
      let forgetCandidates = rawResults.filter((r: any) => {
        const k = ((r.atom?.knowledge || r.text) || "").toLowerCase();
        const id = (r.atom?.id || "").toLowerCase();
        return k.includes(targetLower) || id.includes(targetLower);
      });
      if (forgetCandidates.length > 0) {
        log.info(`forget filtered recall to ${forgetCandidates.length} target-matching results`);
      }

      // Fallback: scan atom knowledge on disk
      if (forgetCandidates.length === 0) {
        log.info("forget recall had no target match, trying knowledge text scan");
        const allAtoms = await store.list();
        const textMatches = allAtoms.filter((a: any) => {
          const knowledgeLower = (a.knowledge || "").toLowerCase();
          const idLower = (a.id || "").toLowerCase();
          return knowledgeLower.includes(targetLower) || idLower.includes(targetLower);
        });
        if (textMatches.length > 0) {
          forgetCandidates = textMatches.map((a: any) => ({
            atom: a,
            score: 0.50,
            text: a.knowledge || a.id,
            matchedChunks: [],
          }));
          log.info(`forget text scan found ${textMatches.length} matches`);
        }
      }

      if (forgetCandidates.length > 0) {
        // Tiered: non-owner/admin can only see [臨] atoms they created
        if (cfg.permission.toolWriteRequiresOwner) {
          const fLevel = resolvePermissionLevel(senderId, senderIsOwner, cfg, state.runtimeAdminIds, undefined, state.systemIdentity);
          if (!hasWriteAccess(fLevel)) {
            forgetCandidates = forgetCandidates.filter((r: any) => {
              const atom = r.atom;
              return atom.sources?.some((s: any) => s.senderId === senderId);
            });
            if (forgetCandidates.length === 0) {
              state.pendingForget = null;
              return {
                prependContext: `<atomic-memory-action action="permission-denied">\nFound matching memories but this user cannot delete them. You can only delete memories you created yourself. Politely explain.\n</atomic-memory-action>`,
              };
            }
          }
        }

        state.pendingForget = {
          target: forgetResult.target,
          candidates: forgetCandidates.slice(0, 5).map((r: any) => ({
            category: r.atom.category,
            id: r.atom.id,
            knowledge: r.atom.knowledge || "",
          })),
          timestamp: Date.now(),
        };
        const candidateList = state.pendingForget.candidates
          .map((c, i) => `${i + 1}. ${c.category}/${c.id}: ${c.knowledge.slice(0, 80)}`)
          .join("\n");
        log.info(`forget stored ${state.pendingForget.candidates.length} pending candidates, awaiting confirmation`);
        return {
          prependContext: `<atomic-memory-action action="forget-confirm">\nThe user wants to forget something about "${forgetResult.target}". Found ${state.pendingForget.candidates.length} matching memories:\n${candidateList}\n\nAsk the user to confirm which one to delete (by number or just "確認" for the first one). The system will handle the actual deletion — you do NOT need to call any tools.\n</atomic-memory-action>`,
        };
      }
      log.info(`forget target "${forgetResult.target}" matched 0 atoms`);
      return {
        prependContext: `<atomic-memory-action action="forget-not-found">\nThe user asked to forget "${forgetResult.target}" but no matching memories were found. Let them know.\n</atomic-memory-action>`,
      };
    } catch (err) {
      log.warn(`forget search failed: ${String(err)}`);
    }
  }

  return undefined;
}

// ============================================================================
// Test Session Helpers
// ============================================================================

function handleTestSessionCheck(
  state: PluginState,
  queryForRecall: string,
): { prependContext: string } | undefined {
  const { store, log } = state;
  const { testSession } = state;

  const cleanupConfirm = /(是|好|對|ok|yes|清理|清除|清掉|結束測試|結束了|測試完|clean|刪掉|清除測試)/i;
  const TEST_CONTENT_PATTERNS = [
    /測試(碼|驗證碼|資料|用的)/,
    /test\s*(code|data|token|key|value)/i,
    /驗證碼/,
    /^XTEST|^ABC\d{3}|MEMORY-OK/i,
  ];

  // ── Stale test atoms from previous sessions (not active) ──
  // User confirms cleanup via natural language → clear immediately
  if (!testSession.active) {
    const testCount = store.countTestAtoms();
    if (testCount > 0 && cleanupConfirm.test(queryForRecall.trim())) {
      const cleared = store.clearTestAtoms();
      log.info(`stale test atoms cleaned up (${cleared} items, confirmed by user)`);
      return {
        prependContext: `<atomic-memory-action action="test-cleanup-done">\nCleared ${cleared} stale test memories from a previous session. Confirm to the user that test data has been cleaned up.\n</atomic-memory-action>`,
      };
    }
    return undefined;
  }

  // ── Active test session ──
  // If we already asked about cleanup
  if (testSession.askedCleanup) {
    const hasTestIntent = TEST_CONTENT_PATTERNS.some((p) => p.test(queryForRecall));
    if (!hasTestIntent) {
      const cleared = store.clearTestAtoms();
      const wasConfirm = cleanupConfirm.test(queryForRecall.trim());
      state.testSession = { active: false, factCount: 0, lastTestTurn: 0, currentTurn: testSession.currentTurn, askedCleanup: false };
      log.info(`test session ended (${wasConfirm ? "confirmed" : "auto"}, cleared ${cleared} test atoms)`);
      if (wasConfirm) {
        return {
          prependContext: `<atomic-memory-action action="test-cleanup-done">\nCleared ${cleared} test memories. Confirm to the user that testing is complete and test data has been cleaned up.\n</atomic-memory-action>`,
        };
      }
    } else {
      testSession.askedCleanup = false;
    }
  }

  // Check if we should ask about ending test session
  const turnsSinceLastTest = testSession.currentTurn - testSession.lastTestTurn;
  const hasTestIntent = TEST_CONTENT_PATTERNS.some((p) => p.test(queryForRecall));
  if (!hasTestIntent && turnsSinceLastTest >= 1 && !testSession.askedCleanup) {
    const testCount = store.countTestAtoms();
    if (testCount > 0) {
      log.info(`test session may be over (${turnsSinceLastTest} turns since last test, ${testCount} test atoms)`);
      testSession.askedCleanup = true;
    }
  }

  return undefined;
}

// ============================================================================
// Tool Registration
// ============================================================================

function registerTools(state: PluginState): void {
  const { cfg, store, vectors, recall, capture, log, api } = state;

  // atom_recall — manual search (factory: receives sender context for isolation)
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "atom_recall",
      label: "Atom Recall",
      description:
        "Search through structured atomic memories (人事時地物). Use when you need specific knowledge about people, events, places, topics, or things the user has discussed. Set crossPlatform=true to search across all channels (e.g. find LINE facts from Discord).",
      parameters: Type.Object({
        query: Type.String({ description: "Search query" }),
        category: Type.Optional(
          Type.Unsafe<AtomCategory>({
            type: "string",
            enum: [...ATOM_CATEGORIES],
            description: "Filter by category: person, topic, event, place, thing",
          }),
        ),
        limit: Type.Optional(Type.Number({ description: "Max results (default: 5)" })),
        crossPlatform: Type.Optional(Type.Boolean({ description: "Search across all platforms, ignoring source channel isolation (default: false)" })),
      }),
      async execute(_toolCallId: string, params: unknown) {
        const { query, category, limit = 5, crossPlatform = false } = params as {
          query: string;
          category?: AtomCategory;
          limit?: number;
          crossPlatform?: boolean;
        };

        const identityLinks = cfg.crossPlatform.enabled ? (toolCtx as any).identityLinks : undefined;
        const results = await recall.search(query, {
          topK: limit,
          senderId: toolCtx.requesterSenderId,
          channel: toolCtx.messageChannel,
          isolationMode: crossPlatform ? "shared" : cfg.memoryIsolation,
          atomStorePath: cfg.atomStorePath,
          actrWeight: cfg.actr.weight,
          identityLinks,
          crossPlatformRecall: crossPlatform || (cfg.crossPlatform.enabled && !!identityLinks),
        });
        const filtered = category
          ? results.filter((r) => r.atom.category === category)
          : results;

        if (filtered.length === 0) {
          return {
            content: [{ type: "text", text: "No matching atoms found." }],
            details: { count: 0 },
          };
        }

        const text = filtered
          .map((r, i) => {
            const a = r.atom;
            const label = CATEGORY_LABELS[a.category];
            const sourceTag = a.sources.length > 0
              ? ` [${[...new Set(a.sources.map(s => s.channel))].join("/")}]`
              : "";
            return `${i + 1}. [${label}:${a.category}/${a.id}] ${a.confidence} (${(r.score * 100).toFixed(0)}%)${sourceTag}\n   ${a.knowledge.slice(0, 200)}`;
          })
          .join("\n\n");

        return {
          content: [{ type: "text", text: `Found ${filtered.length} atoms:\n\n${text}` }],
          details: {
            count: filtered.length,
            atoms: filtered.map((r) => ({
              ref: `${r.atom.category}/${r.atom.id}`,
              confidence: r.atom.confidence,
              score: r.score,
              knowledge: r.atom.knowledge,
              sources: r.atom.sources,
            })),
          },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "atom_recall" },
  );

  // atom_store — manual store (factory: receives sender context for source tracking)
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "atom_store",
      label: "Atom Store",
      description:
        "Store or update a fact in memory. Use when the user asks to remember, correct, or change a memory (e.g. 記住、幫我改記憶、其實是…). To correct a fact: first atom_forget the old one, then atom_store the new one.",
      parameters: Type.Object({
        text: Type.String({ description: "The fact to remember (≤150 chars)" }),
        category: Type.Unsafe<AtomCategory>({
          type: "string",
          enum: [...ATOM_CATEGORIES],
          description: "Category: person, topic, event, place, thing",
        }),
        confidence: Type.Optional(
          Type.Unsafe<Confidence>({
            type: "string",
            enum: ["[固]", "[觀]", "[臨]"],
            description: "Confidence tier (default: [臨])",
          }),
        ),
      }),
      async execute(_toolCallId: string, params: unknown) {
        // Permission check: owner or admin can store memories
        if (cfg.permission.toolWriteRequiresOwner) {
          const toolLevel = resolvePermissionLevel(toolCtx.requesterSenderId, toolCtx.senderIsOwner, cfg, state.runtimeAdminIds, toolCtx.messageChannel, state.systemIdentity);
          if (!hasWriteAccess(toolLevel)) {
            return {
              content: [{ type: "text", text: "Permission denied: only the manager or admin can store memories." }],
              details: { error: "permission_denied", action: "store" },
            };
          }
        }

        const {
          text,
          category,
          confidence = "[臨]",
        } = params as {
          text: string;
          category: AtomCategory;
          confidence?: Confidence;
        };

        // Test data detection
        if (isTestFact(text)) {
          const testId = await store.storeTest({ text, category, confidence });
          state.testSession.factCount++;
          state.testSession.lastTestTurn = state.testSession.currentTurn;
          if (state.testSession.factCount >= 1) state.testSession.active = true;
          return {
            content: [
              { type: "text", text: `Test fact stored in _test/ area: ${testId}` },
            ],
            details: { action: "test", ref: `_test/${testId}` },
          };
        }

        // Dedup check
        const dedup = await capture.checkDuplicate(text);
        if (dedup.verdict === "duplicate") {
          return {
            content: [
              { type: "text", text: `Similar atom already exists: "${dedup.existingAtom?.text}"` },
            ],
            details: { action: "duplicate", existing: dedup.existingAtom },
          };
        }

        // G1-B: Tool-invoked store is always memory-store intent → user scope
        const toolScope = classifyScope("memory-store", text);
        const sourceOpts = toolCtx.requesterSenderId
          ? { channel: toolCtx.messageChannel ?? "unknown", senderId: toolCtx.requesterSenderId, scope: toolScope }
          : { scope: toolScope };
        const atom = await store.findOrCreate(category, { text, category, confidence }, sourceOpts);
        const chunks = chunkAtom(atom);
        if (chunks.length > 0) {
          await vectors.index(chunks);
        }
        await store.updateMemoryIndex();

        return {
          content: [
            { type: "text", text: `Stored atom: [${category}/${atom.id}] ${atom.confidence}` },
          ],
          details: { action: "created", ref: `${category}/${atom.id}` },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "atom_store" },
  );

  // atom_forget — delete/archive (factory: receives sender context for isolation)
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "atom_forget",
      label: "Atom Forget",
      description:
        "Delete or archive a memory. Use when the user asks to forget, remove, or delete something from memory (e.g. 忘記、刪除記憶、不要記這個). If only query is provided and exactly one atom matches, it will be auto-deleted.",
      parameters: Type.Object({
        query: Type.Optional(Type.String({ description: "Search query to find the atom to delete (e.g. 小花, 貓)" })),
        atomRef: Type.Optional(
          Type.String({ description: "Direct atom reference: category/id (e.g. person/小明)" }),
        ),
        archive: Type.Optional(
          Type.Boolean({ description: "Archive instead of hard-delete (default: true)" }),
        ),
      }),
      async execute(_toolCallId: string, params: unknown) {
        // Permission: tiered forget — owner/admin can delete anything,
        // regular user can only delete [臨] atoms they created.
        const forgetLevel = resolvePermissionLevel(
          toolCtx.requesterSenderId, toolCtx.senderIsOwner, cfg, state.runtimeAdminIds, toolCtx.messageChannel, state.systemIdentity,
        );

        const { query, atomRef, archive = true } = params as {
          query?: string;
          atomRef?: string;
          archive?: boolean;
        };

        if (atomRef) {
          // Tiered check for direct atomRef deletion
          if (cfg.permission.toolWriteRequiresOwner && !hasWriteAccess(forgetLevel)) {
            const [chkCat, chkId] = atomRef.split("/") as [AtomCategory, string];
            const targetAtom = chkCat && chkId ? await store.get(chkCat, chkId) : undefined;
            if (targetAtom) {
              const createdBySender = targetAtom.sources.some(s => s.senderId === toolCtx.requesterSenderId);
              if (targetAtom.confidence !== "[臨]" || !createdBySender) {
                return {
                  content: [{ type: "text", text: "Permission denied: you can only delete temporary memories you created." }],
                  details: { error: "permission_denied", action: "forget", level: forgetLevel },
                };
              }
            }
          }
          const [category, id] = atomRef.split("/") as [AtomCategory, string];
          if (!category || !id) {
            return {
              content: [{ type: "text", text: "Invalid atom reference. Use category/id format." }],
              details: { error: "invalid_ref" },
            };
          }

          if (archive) {
            const moved = await store.moveToDistant(category, id);
            if (!moved) {
              return {
                content: [{ type: "text", text: `Atom not found: ${atomRef}` }],
                details: { error: "not_found" },
              };
            }
            await vectors.deleteAtom(`${category}/${id}`);
            await store.updateMemoryIndex();
            return {
              content: [{ type: "text", text: `Archived: ${atomRef}` }],
              details: { action: "archived", ref: atomRef },
            };
          }

          const deleted = await store.delete(category, id);
          if (!deleted) {
            return {
              content: [{ type: "text", text: `Atom not found: ${atomRef}` }],
              details: { error: "not_found" },
            };
          }
          await vectors.deleteAtom(`${category}/${id}`);
          await store.updateMemoryIndex();
          return {
            content: [{ type: "text", text: `Deleted: ${atomRef}` }],
            details: { action: "deleted", ref: atomRef },
          };
        }

        if (query) {
          const results = await recall.search(query, {
            topK: 5,
            minScore: 0.3,
            senderId: toolCtx.requesterSenderId,
            channel: toolCtx.messageChannel,
            isolationMode: cfg.memoryIsolation,
          });
          if (results.length === 0) {
            return {
              content: [{ type: "text", text: "No matching atoms found." }],
              details: { found: 0 },
            };
          }

          // Auto-delete: single match OR clear winner
          const clearWinner =
            results.length === 1 ||
            (results.length >= 2 && results[0].score - results[1].score > 0.15);
          if (clearWinner) {
            const target = results[0];
            const ref = `${target.atom.category}/${target.atom.id}`;

            // Tiered permission check for query-based forget
            if (cfg.permission.toolWriteRequiresOwner && !hasWriteAccess(forgetLevel)) {
              const createdBySender = target.atom.sources.some(s => s.senderId === toolCtx.requesterSenderId);
              if (target.atom.confidence !== "[臨]" || !createdBySender) {
                return {
                  content: [{ type: "text", text: "Permission denied: you can only delete temporary memories you created." }],
                  details: { error: "permission_denied", action: "forget", level: forgetLevel },
                };
              }
            }
            if (archive) {
              await store.moveToDistant(target.atom.category, target.atom.id);
            } else {
              await store.delete(target.atom.category, target.atom.id);
            }
            await vectors.deleteAtom(ref);
            await store.updateMemoryIndex();
            return {
              content: [
                {
                  type: "text",
                  text: `${archive ? "Archived" : "Deleted"}: ${ref} — ${target.atom.knowledge.slice(0, 80)}`,
                },
              ],
              details: { action: archive ? "archived" : "deleted", ref },
            };
          }

          const list = results
            .map((r) => `- ${r.atom.category}/${r.atom.id}: ${r.atom.knowledge.slice(0, 60)}`)
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${results.length} candidates. Specify atomRef to delete:\n${list}`,
              },
            ],
            details: {
              action: "candidates",
              candidates: results.map((r) => ({
                ref: `${r.atom.category}/${r.atom.id}`,
                score: r.score,
              })),
            },
          };
        }

        return {
          content: [{ type: "text", text: "Provide query or atomRef." }],
          details: { error: "missing_param" },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "atom_forget" },
  );

  // atom_clear_test — clear stale test atoms (owner/admin only)
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "atom_clear_test",
      label: "Clear Test Memories",
      description:
        "Clear all test memory items from the _test/ area. Use when the user asks to clean up test memories, or when stale test data is pending cleanup. Owner/admin only.",
      parameters: Type.Object({}),
      async execute() {
        if (cfg.permission.toolWriteRequiresOwner) {
          const level = resolvePermissionLevel(
            toolCtx.requesterSenderId, toolCtx.senderIsOwner, cfg, state.runtimeAdminIds, toolCtx.messageChannel, state.systemIdentity,
          );
          if (!hasWriteAccess(level)) {
            return {
              content: [{ type: "text", text: "Permission denied: only owner/admin can clear test memories." }],
              details: { error: "permission_denied" },
            };
          }
        }
        const count = store.countTestAtoms();
        if (count === 0) {
          return {
            content: [{ type: "text", text: "No test memories to clear." }],
            details: { cleared: 0 },
          };
        }
        const cleared = store.clearTestAtoms();
        state.testSession = { active: false, factCount: 0, lastTestTurn: 0, currentTurn: state.testSession.currentTurn, askedCleanup: false };
        log.info(`atom_clear_test tool cleared ${cleared} test atoms`);
        return {
          content: [{ type: "text", text: `Cleared ${cleared} test memories.` }],
          details: { cleared },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "atom_clear_test" },
  );

  // atom_link — cross-platform person identity linking
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "atom_link",
      label: "Atom Link",
      description:
        "Link a person atom to another platform identity. Use when the user says someone's account on another platform (e.g. 小明的Discord帳號是xiaoming#1234, 他的LINE是XXX).",
      parameters: Type.Object({
        personRef: Type.String({ description: "Person atom ref: person/id (e.g. person/小明)" }),
        channel: Type.String({ description: "Target platform channel (e.g. discord, telegram, line)" }),
        senderId: Type.String({ description: "Platform-specific user ID on the target channel" }),
        displayName: Type.Optional(Type.String({ description: "Display name on the target platform" })),
      }),
      async execute(_toolCallId: string, params: unknown) {
        const linkLevel = resolvePermissionLevel(toolCtx.requesterSenderId, toolCtx.senderIsOwner, cfg, state.runtimeAdminIds, toolCtx.messageChannel, state.systemIdentity);
        if (cfg.permission.toolWriteRequiresOwner && !hasWriteAccess(linkLevel)) {
          return {
            content: [{ type: "text", text: "Permission denied: only the manager or admin can link identities." }],
            details: { error: "permission_denied", action: "link" },
          };
        }

        const { personRef, channel, senderId, displayName } = params as {
          personRef: string;
          channel: string;
          senderId: string;
          displayName?: string;
        };

        const atomId = personRef.startsWith("person/") ? personRef.slice(7) : personRef;
        const updated = await linkPersonAcrossPlatforms(atomId, channel, senderId, store, displayName);
        if (!updated) {
          return {
            content: [{ type: "text", text: `Person atom not found: person/${atomId}` }],
            details: { error: "not_found" },
          };
        }

        // Re-index for vector search
        const chunks = chunkAtom(updated);
        if (chunks.length > 0) {
          await vectors.deleteAtom(`person/${atomId}`);
          await vectors.index(chunks);
        }

        return {
          content: [{ type: "text", text: `Linked person/${atomId} to ${channel}:${senderId}${displayName ? ` (${displayName})` : ""}` }],
          details: { action: "linked", ref: `person/${atomId}`, target: `${channel}:${senderId}` },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "atom_link" },
  );

  // atom_whois — cross-platform person info lookup
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "atom_whois",
      label: "Atom Whois",
      description:
        "Look up a person across all platforms. Returns all known information about them: which platforms they're on, what you know about them, and when they were last seen. Use when someone asks '小明是誰' or 'who is xiaoming'.",
      parameters: Type.Object({
        query: Type.String({ description: "Person name, userId, or channel:senderId to look up" }),
      }),
      async execute(_toolCallId: string, params: unknown) {
        // Permission check: owner-only mode
        if (cfg.memoryIsolation === "owner-only" && toolCtx.senderIsOwner === false) {
          return {
            content: [{ type: "text", text: "Permission denied: only the owner can look up person info." }],
            details: { error: "permission_denied", action: "whois" },
          };
        }

        const { query } = params as { query: string };
        const queryLower = query.toLowerCase().trim();

        const personAtoms = await store.list("person");
        const matches: Array<{ atom: typeof personAtoms[0]; matchType: string }> = [];

        for (const pa of personAtoms) {
          // Match by id
          if (pa.id.toLowerCase() === queryLower) {
            matches.push({ atom: pa, matchType: "id" });
            continue;
          }
          // Match by trigger (name, senderId, channel:senderId)
          const triggerMatch = pa.triggers.some(t => {
            const tl = t.toLowerCase();
            return tl === queryLower || tl.includes(queryLower) || queryLower.includes(tl);
          });
          if (triggerMatch) {
            matches.push({ atom: pa, matchType: "trigger" });
            continue;
          }
          // Match by source senderId
          const sourceMatch = pa.sources.some(s =>
            s.senderId?.toLowerCase() === queryLower,
          );
          if (sourceMatch) {
            matches.push({ atom: pa, matchType: "source" });
          }
        }

        if (matches.length === 0) {
          return {
            content: [{ type: "text", text: `No person found matching "${query}".` }],
            details: { count: 0 },
          };
        }

        // Also find non-person atoms related to matched persons
        const relatedAtoms: RecalledAtom[] = [];
        for (const m of matches) {
          for (const relRef of m.atom.related) {
            const [relCat, relId] = relRef.split("/") as [AtomCategory, string];
            if (relCat && relId) {
              const relAtom = await store.get(relCat, relId);
              if (relAtom) {
                relatedAtoms.push({ atom: relAtom, score: 0.5, matchedChunks: [] });
              }
            }
          }
        }

        const lines: string[] = [];
        for (const m of matches) {
          const pa = m.atom;
          const platforms = [...new Set(pa.sources.map(s => s.channel))];
          const identities = pa.sources.map(s => `${s.channel}:${s.senderId ?? "?"}`);

          lines.push(`## person/${pa.id} ${pa.confidence}`);
          lines.push(`Platforms: ${platforms.join(", ") || "unknown"}`);
          lines.push(`Identities: ${identities.join(", ")}`);
          lines.push(`Last seen: ${pa.lastUsed}`);
          lines.push(`Confirmations: ${pa.confirmations}`);
          lines.push(`Knowledge:\n${pa.knowledge}`);
        }

        if (relatedAtoms.length > 0) {
          lines.push(`\n--- Related ---`);
          for (const r of relatedAtoms) {
            const srcTag = r.atom.sources.length > 0
              ? ` [${[...new Set(r.atom.sources.map(s => s.channel))].join("/")}]`
              : "";
            lines.push(`[${r.atom.category}/${r.atom.id}]${srcTag} ${r.atom.knowledge.slice(0, 120)}`);
          }
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: {
            count: matches.length,
            persons: matches.map(m => ({
              ref: `person/${m.atom.id}`,
              platforms: [...new Set(m.atom.sources.map(s => s.channel))],
              sources: m.atom.sources,
              knowledge: m.atom.knowledge,
              lastUsed: m.atom.lastUsed,
              confirmations: m.atom.confirmations,
            })),
            related: relatedAtoms.map(r => ({
              ref: `${r.atom.category}/${r.atom.id}`,
              knowledge: r.atom.knowledge.slice(0, 120),
            })),
          },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "atom_whois" },
  );

  // atom_permission — owner-only admin management
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "atom_permission",
      label: "Atom Permission",
      description:
        "Manage memory admin permissions. Only the owner/manager can use this. " +
        "Use when the owner says things like '讓 user123 也能管理記憶' or 'remove admin user456'.",
      parameters: Type.Object({
        action: Type.Unsafe<"add" | "remove" | "list">({
          type: "string",
          enum: ["add", "remove", "list"],
          description: "Action: add/remove admin, or list current admins",
        }),
        userId: Type.Optional(Type.String({ description: "Platform user ID to add/remove as admin" })),
      }),
      async execute(_toolCallId: string, params: unknown) {
        // Only owner can manage permissions
        if (toolCtx.senderIsOwner !== true) {
          return {
            content: [{ type: "text", text: "Permission denied: only the manager can manage admin permissions." }],
            details: { error: "permission_denied", action: "permission" },
          };
        }

        const { action, userId } = params as { action: "add" | "remove" | "list"; userId?: string };
        const storePath = api.resolvePath(cfg.atomStorePath);

        if (action === "list") {
          const runtimeAdmins = await loadRuntimeAdmins(storePath);
          const allAdmins = [...new Set([...cfg.permission.adminIds, ...runtimeAdmins])];
          return {
            content: [{ type: "text", text: allAdmins.length > 0 ? `Current admins: ${allAdmins.join(", ")}` : "No admins configured." }],
            details: { admins: allAdmins },
          };
        }

        if (!userId) {
          return {
            content: [{ type: "text", text: "Please specify a userId." }],
            details: { error: "missing_param" },
          };
        }

        if (action === "add") {
          const added = await addRuntimeAdmin(storePath, userId);
          if (added) {
            state.runtimeAdminIds.push(userId);
            // Permission audit: record admin addition to atomic memory
            try {
              const auditText = `[permission-audit] Admin added: ${userId} by owner on ${new Date().toISOString().slice(0, 10)}`;
              await store.findOrCreate("event" as any, {
                text: auditText, category: "event" as any, confidence: "[臨]",
              }, { scope: "global" });
              log.info(`permission audit: admin added ${userId}`);
            } catch { /* audit is best-effort */ }
          }
          return {
            content: [{ type: "text", text: added ? `Added admin: ${userId}` : `${userId} is already an admin.` }],
            details: { action: "admin_added", userId, added },
          };
        }

        if (action === "remove") {
          const removed = await removeRuntimeAdmin(storePath, userId);
          if (removed) {
            const idx = state.runtimeAdminIds.indexOf(userId);
            if (idx >= 0) state.runtimeAdminIds.splice(idx, 1);
            // Permission audit: record admin removal to atomic memory
            try {
              const auditText = `[permission-audit] Admin removed: ${userId} by owner on ${new Date().toISOString().slice(0, 10)}`;
              await store.findOrCreate("event" as any, {
                text: auditText, category: "event" as any, confidence: "[臨]",
              }, { scope: "global" });
              log.info(`permission audit: admin removed ${userId}`);
            } catch { /* audit is best-effort */ }
          }
          return {
            content: [{ type: "text", text: removed ? `Removed admin: ${userId}` : `${userId} is not a runtime admin.` }],
            details: { action: "admin_removed", userId, removed },
          };
        }

        return {
          content: [{ type: "text", text: "Invalid action. Use: add, remove, or list." }],
          details: { error: "invalid_action" },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "atom_permission" },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Self-Iterate Tools (Phase 4) — owner-only, requires codeModification.enabled
  // ──────────────────────────────────────────────────────────────────────────

  const codeModCfg = cfg.selfIteration.codeModification;

  // self_analyze — read-only code analysis
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "self_analyze",
      label: "Self-Analyze",
      description:
        "Analyze source code for improvement opportunities. Owner-only. " +
        "Reads files at the given path, checks git history, and recalls related architecture knowledge from atomic memory. " +
        "Use before self_propose to understand the codebase.",
      parameters: Type.Object({
        path: Type.String({ description: "Relative path to analyze (file or directory, e.g. 'extensions/atomic-memory/src/recall-engine.ts')" }),
      }),
      async execute(_toolCallId: string, params: unknown) {
        const { path: targetPath } = params as { path: string };

        // Permission: owner-only + codeModification enabled
        const check = canTriggerEvolution(toolCtx.senderIsOwner, codeModCfg);
        if (!check.allowed) {
          return {
            content: [{ type: "text", text: `Permission denied: ${check.reason}` }],
            details: { error: "permission_denied" },
          };
        }

        // Feedback loop: auto atom_recall for related knowledge
        const recallFn = async (query: string): Promise<string> => {
          try {
            const results = await recall.search(query, { topK: 3, minScore: 0.3 });
            if (results.length === 0) return "";
            return results.map(r =>
              `[${r.atom.category}/${r.atom.id}] ${r.atom.confidence} ${r.atom.knowledge.slice(0, 200)}`
            ).join("\n");
          } catch { return ""; }
        };

        const result = await selfAnalyze(targetPath, codeModCfg, recallFn);

        const fileList = result.files.map(f =>
          `  ${f.path} (${f.lines} lines)`
        ).join("\n");

        const output = [
          `## Analysis: ${result.path}`,
          `**Files:** ${result.files.length} (${result.totalLines} total lines)`,
          fileList,
          `\n**Git History:**\n${result.gitHistory}`,
          result.relatedKnowledge
            ? `\n**Related Knowledge:**\n${result.relatedKnowledge}`
            : "",
          result.files.length > 0
            ? `\n**File Contents:**\n${result.files.map(f => `### ${f.path}\n\`\`\`\n${f.preview}\n\`\`\``).join("\n\n")}`
            : "",
        ].filter(Boolean).join("\n");

        return {
          content: [{ type: "text", text: output }],
          details: {
            path: result.path,
            fileCount: result.files.length,
            totalLines: result.totalLines,
          },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "self_analyze" },
  );

  // self_propose — read-only proposal validation
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "self_propose",
      label: "Self-Propose",
      description:
        "Validate target files and prepare a modification proposal. Owner-only. " +
        "Checks paths against evolve guard rules. Returns file contents for the agent to generate diff proposals. " +
        "Use after self_analyze, before making actual edits.",
      parameters: Type.Object({
        description: Type.String({ description: "What you want to change and why" }),
        targetPaths: Type.Array(Type.String(), { description: "Relative paths of files to modify" }),
      }),
      async execute(_toolCallId: string, params: unknown) {
        const { description, targetPaths } = params as { description: string; targetPaths: string[] };

        const check = canTriggerEvolution(toolCtx.senderIsOwner, codeModCfg);
        if (!check.allowed) {
          return {
            content: [{ type: "text", text: `Permission denied: ${check.reason}` }],
            details: { error: "permission_denied" },
          };
        }

        const result = selfPropose(description, targetPaths, codeModCfg);

        const fileLines = result.targetFiles.map(f => {
          const status = f.guardOk ? "✓" : `✗ ${f.guardReason}`;
          return `  ${status} ${f.path} (${f.lines} lines)`;
        }).join("\n");

        const output = [
          `## Proposal: ${result.description}`,
          `**Guard check:** ${result.allGuardsPassed ? "All paths OK ✓" : "BLOCKED — see below"}`,
          `**Limits:** max ${result.limits.maxFiles} files, max ${result.limits.maxLines} lines`,
          `**Target files:**\n${fileLines}`,
          result.allGuardsPassed
            ? `\n**File Contents for Review:**\n${result.targetFiles.map(f => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\``).join("\n\n")}`
            : "\nFix blocked paths before proceeding.",
        ].join("\n");

        return {
          content: [{ type: "text", text: output }],
          details: {
            description: result.description,
            allGuardsPassed: result.allGuardsPassed,
            fileCount: result.targetFiles.length,
          },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "self_propose" },
  );

  // self_apply — validate + build + commit pipeline
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "self_apply",
      label: "Self-Apply",
      description:
        "Validate uncommitted changes, run build, and commit. Owner-only. " +
        "Call AFTER you have already edited files. The tool validates paths against evolve guard, " +
        "runs `pnpm build`, and commits on success. Auto-reverts on build failure if configured. " +
        "Automatically records a journal entry on success.",
      parameters: Type.Object({
        description: Type.String({ description: "Short description of what was changed and why" }),
      }),
      async execute(_toolCallId: string, params: unknown) {
        const { description } = params as { description: string };

        const check = canTriggerEvolution(toolCtx.senderIsOwner, codeModCfg);
        if (!check.allowed) {
          return {
            content: [{ type: "text", text: `Permission denied: ${check.reason}` }],
            details: { error: "permission_denied" },
          };
        }

        const result = selfApply(description, codeModCfg);

        // Feedback loop: auto-journal on success
        if (result.success && result.journalMarkdown) {
          const journalStoreFn = async (text: string, category: string): Promise<string | null> => {
            try {
              const atom = await store.findOrCreate(category as any, {
                text, category: category as any, confidence: "[臨]",
              }, { scope: "global" });
              const chunks = chunkAtom(atom);
              if (chunks.length > 0) await vectors.index(chunks);
              return `${atom.category}/${atom.id}`;
            } catch { return null; }
          };

          const journalResult = await selfJournal(
            description,
            `${result.stats.linesAdded}+ ${result.stats.linesRemoved}- in ${result.filesChanged.length} files`,
            true,
            journalStoreFn,
          );
          if (journalResult.stored) {
            log.info(`self_apply auto-journal: ${journalResult.atomRef}`);
          }
        }

        // Feedback loop: record pitfall on failure
        if (!result.success && result.error) {
          const pitfallStoreFn = async (text: string, category: string): Promise<string | null> => {
            try {
              const atom = await store.findOrCreate(category as any, {
                text, category: category as any, confidence: "[臨]",
              }, { scope: "global" });
              return `${atom.category}/${atom.id}`;
            } catch { return null; }
          };
          await recordPitfall(description, result.error, pitfallStoreFn);
        }

        const statusEmoji = result.success ? "✓" : result.reverted ? "↩" : "✗";
        const output = [
          `## Self-Apply: ${statusEmoji} ${result.success ? "Success" : "Failed"}`,
          `**Build:** ${result.buildResult}`,
          result.commitHash ? `**Commit:** ${result.commitHash.slice(0, 9)}` : "",
          result.reverted ? "**Auto-reverted:** yes" : "",
          `**Changed files (${result.filesChanged.length}):** ${result.filesChanged.join(", ")}`,
          `**Stats:** +${result.stats.linesAdded} -${result.stats.linesRemoved}`,
          result.error ? `\n**Error:**\n${result.error}` : "",
        ].filter(Boolean).join("\n");

        return {
          content: [{ type: "text", text: output }],
          details: {
            success: result.success,
            buildResult: result.buildResult,
            commitHash: result.commitHash,
            reverted: result.reverted,
            filesChanged: result.filesChanged,
          },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "self_apply" },
  );

  // self_journal — record iteration knowledge
  api.registerTool(
    ((toolCtx: OpenClawPluginToolContext) => ({
      name: "self_journal",
      label: "Self-Journal",
      description:
        "Record an iteration result or discovery to atomic memory. Owner-only. " +
        "Use to log what was changed, why, and whether it succeeded. " +
        "Entries are stored as [臨] atoms and can be queried via atom_recall.",
      parameters: Type.Object({
        summary: Type.String({ description: "What was done (short, ≤100 chars)" }),
        details: Type.Optional(Type.String({ description: "Additional context: reasoning, diff stats, test results" })),
        success: Type.Boolean({ description: "Whether the iteration succeeded" }),
      }),
      async execute(_toolCallId: string, params: unknown) {
        const { summary, details = "", success } = params as {
          summary: string; details?: string; success: boolean;
        };

        const check = canTriggerEvolution(toolCtx.senderIsOwner, codeModCfg);
        if (!check.allowed) {
          return {
            content: [{ type: "text", text: `Permission denied: ${check.reason}` }],
            details: { error: "permission_denied" },
          };
        }

        const storeFn = async (text: string, category: string): Promise<string | null> => {
          try {
            const atom = await store.findOrCreate(category as any, {
              text, category: category as any, confidence: "[臨]",
            }, { scope: "global" });
            const chunks = chunkAtom(atom);
            if (chunks.length > 0) await vectors.index(chunks);
            await store.updateMemoryIndex();
            return `${atom.category}/${atom.id}`;
          } catch { return null; }
        };

        const result = await selfJournal(summary, details, success, storeFn);

        if (result.stored) {
          return {
            content: [{ type: "text", text: `Journal entry stored: ${result.atomRef}` }],
            details: { action: "stored", atomRef: result.atomRef },
          };
        }

        return {
          content: [{ type: "text", text: `Journal entry failed: ${result.error ?? "unknown"}` }],
          details: { error: result.error },
        };
      },
    })) as OpenClawPluginToolFactory,
    { name: "self_journal" },
  );
}

// ============================================================================
// Command Registration
// ============================================================================

function registerCommands(state: PluginState): void {
  const { cfg, store, vectors, recall, log, api } = state;

  api.registerCommand({
    name: "atoms",
    description: "查看原子記憶 — /atoms [list|stats]",
    acceptsArgs: true,
    handler: async (ctx) => {
      const args = ctx.args?.trim() ?? "";

      if (args === "stats" || args === "") {
        const atoms = await store.list();
        const byCategory: Record<string, number> = {};
        const byConfidence: Record<string, number> = {};

        for (const atom of atoms) {
          byCategory[atom.category] = (byCategory[atom.category] ?? 0) + 1;
          byConfidence[atom.confidence] = (byConfidence[atom.confidence] ?? 0) + 1;
        }

        const categoryLines = Object.entries(byCategory)
          .map(([k, v]) => `  ${CATEGORY_LABELS[k as AtomCategory] ?? k}(${k}): ${v}`)
          .join("\n");

        const confidenceLines = Object.entries(byConfidence)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n");

        return {
          text: `📊 Atomic Memory Stats\n\nTotal: ${atoms.length} atoms\n\nBy category:\n${categoryLines}\n\nBy confidence:\n${confidenceLines}`,
        };
      }

      if (args === "list" || args.startsWith("list")) {
        const categoryArg = args.split(" ")[1] as AtomCategory | undefined;
        const validCategory = categoryArg && ATOM_CATEGORIES.includes(categoryArg)
          ? categoryArg
          : undefined;

        const atoms = await store.list(validCategory);
        if (atoms.length === 0) {
          return { text: "No atoms found." };
        }

        const lines = atoms
          .map((a) => `${a.confidence} ${a.category}/${a.id} — ${a.triggers.join(", ")}`)
          .join("\n");

        return { text: `Atoms (${atoms.length}):\n${lines}` };
      }

      return { text: "Usage: /atoms [list [category]|stats]" };
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // /iterate — self-evolution convenience command (Phase 4)
  // ──────────────────────────────────────────────────────────────────────────

  api.registerCommand({
    name: "iterate",
    description: "自我迭代 — /iterate [status|approve|reject|history|analyze|propose|apply|journal]",
    acceptsArgs: true,
    handler: async (ctx) => {
      const codeModCfg = cfg.selfIteration.codeModification;

      // Permission: owner-only (resolve from senderId + identity)
      const senderLevel = resolvePermissionLevel(
        ctx.senderId, undefined, cfg, state.runtimeAdminIds, ctx.channel, state.systemIdentity,
      );
      if (senderLevel !== "owner") {
        return { text: "⛔ /iterate requires owner permission." };
      }

      const args = ctx.args?.trim() ?? "";
      const spaceIdx = args.indexOf(" ");
      const subCmd = spaceIdx > 0 ? args.slice(0, spaceIdx) : args;
      const subArgs = spaceIdx > 0 ? args.slice(spaceIdx + 1).trim() : "";

      // ── /iterate status — OETAV observation dashboard (no codeModification required) ──
      if (subCmd === "status") {
        const atomStorePath = cfg.atomStorePath;
        const { formatEvidenceSummary } = await import("./src/evidence-accumulator.js");

        const [evidenceSummary, healthSummary, thresholdSummary, proposalsSummary, executedSummary] = await Promise.all([
          formatEvidenceSummary(atomStorePath),
          formatHealthSummary(atomStorePath),
          formatThresholdSummary(atomStorePath),
          formatProposalsSummary(atomStorePath),
          formatExecutedSummary(atomStorePath),
        ]);

        // Zhixing report
        const evidence = await getAllEvidence(atomStorePath);
        const { checkZhixingUnity } = await import("./src/threshold-balancer.js");
        const zhixing = checkZhixingUnity(evidence, {
          gracePeriodCycles: cfg.selfIteration.autonomousIteration.staleEvidence.gracePeriodCycles,
          decayRate: cfg.selfIteration.autonomousIteration.staleEvidence.decayRate,
          archiveThreshold: cfg.selfIteration.autonomousIteration.staleEvidence.archiveThreshold,
        });
        const zhixingLines = zhixing.separations.length > 0
          ? zhixing.separations.map((s) =>
              `  ${s.signalType}: score=${s.evidenceScore.toFixed(2)}, stale=${s.cyclesStale}, ` +
              `urgency=${s.urgency.toFixed(2)} → ${s.recommendation}`,
            ).join("\n")
          : "  No separations";

        // Maturity phase
        const iterState = await loadIterationState(atomStorePath);

        return {
          text: [
            "## OETAV Self-Iteration Status",
            "",
            `**Maturity Phase**: ${iterState.maturityPhase} (${iterState.totalEpisodics} episodics)`,
            "",
            `### Health`,
            healthSummary,
            "",
            `### Evidence`,
            evidenceSummary,
            "",
            `### Thresholds`,
            thresholdSummary,
            "",
            `### Proposals`,
            proposalsSummary,
            "",
            `### Executed / Outcomes`,
            executedSummary,
            "",
            `### 知行合一 (Unity: ${zhixing.unityScore.toFixed(2)})`,
            zhixingLines,
          ].join("\n"),
        };
      }

      // ── /iterate approve <id> — approve a pending proposal ──
      if (subCmd === "approve") {
        if (!subArgs) return { text: "Usage: /iterate approve <proposal-id>" };
        const atomStorePath = cfg.atomStorePath;
        const cmdSessionKey = `${ctx.channel}-${ctx.senderId ?? "owner"}-cmd`;
        const baselineSnapshot = await snapshotMetrics(store, cmdSessionKey);
        const result = await approveProposal(
          subArgs.trim(),
          store,
          atomStorePath,
          cmdSessionKey,
          baselineSnapshot,
          log,
        );
        return {
          text: result.error
            ? `❌ ${result.error}`
            : `✓ Approved: ${result.details?.slice(0, 120) ?? result.proposalId}`,
        };
      }

      // ── /iterate reject <id> [reason] — reject a pending proposal ──
      if (subCmd === "reject") {
        if (!subArgs) return { text: "Usage: /iterate reject <id> [reason]" };
        const parts = subArgs.trim().split(/\s+/);
        const proposalId = parts[0];
        const reason = parts.slice(1).join(" ") || "Rejected by owner.";
        const atomStorePath = cfg.atomStorePath;
        const result = await rejectProposal(proposalId, atomStorePath, reason, log);
        return {
          text: result.error
            ? `❌ ${result.error}`
            : `✓ Rejected: ${proposalId} — ${reason}`,
        };
      }

      // ── /iterate history — show executed proposals + outcomes ──
      if (subCmd === "history") {
        const atomStorePath = cfg.atomStorePath;
        const summary = await formatExecutedSummary(atomStorePath);
        return { text: `## OETAV Execution History\n\n${summary}` };
      }

      if (!codeModCfg.enabled) {
        return { text: "⛔ Self-evolution is disabled. Set selfIteration.codeModification.enabled = true in config." };
      }

      // ── /iterate analyze <path> ──
      if (subCmd === "analyze") {
        if (!subArgs) return { text: "Usage: /iterate analyze <path>" };

        const recallFn = async (query: string): Promise<string> => {
          try {
            const results = await recall.search(query, { topK: 3, minScore: 0.3 });
            if (results.length === 0) return "";
            return results.map(r =>
              `[${r.atom.category}/${r.atom.id}] ${r.atom.confidence} ${r.atom.knowledge.slice(0, 200)}`
            ).join("\n");
          } catch { return ""; }
        };

        const result = await selfAnalyze(subArgs, codeModCfg, recallFn);

        const fileList = result.files.map(f =>
          `  ${f.path} (${f.lines} lines)`
        ).join("\n");

        return {
          text: [
            `## Analysis: ${result.path}`,
            `Files: ${result.files.length} (${result.totalLines} total lines)`,
            fileList,
            `\nGit History:\n${result.gitHistory}`,
            result.relatedKnowledge ? `\nRelated Knowledge:\n${result.relatedKnowledge}` : "",
            result.files.length > 0
              ? `\nFile Contents:\n${result.files.map(f => `### ${f.path}\n\`\`\`\n${f.preview}\n\`\`\``).join("\n\n")}`
              : "",
          ].filter(Boolean).join("\n"),
        };
      }

      // ── /iterate propose <description> ──
      if (subCmd === "propose") {
        if (!subArgs) return { text: "Usage: /iterate propose <description>" };
        return {
          text: [
            `## Proposal Mode`,
            `Description: ${subArgs}`,
            ``,
            `To proceed, use the self_propose tool with specific target file paths:`,
            `\`self_propose({ description: "${subArgs}", targetPaths: ["path/to/file.ts"] })\``,
            ``,
            `Or tell me which files you'd like to modify and I'll validate them against the evolve guard.`,
          ].join("\n"),
        };
      }

      // ── /iterate apply ──
      if (subCmd === "apply") {
        const description = subArgs || "manual iteration";
        const result = selfApply(description, codeModCfg);

        // Feedback loop: auto-journal on success
        if (result.success && result.journalMarkdown) {
          const storeFn = async (text: string, category: string): Promise<string | null> => {
            try {
              const atom = await store.findOrCreate(category as any, {
                text, category: category as any, confidence: "[臨]",
              }, { scope: "global" });
              const chunks = chunkAtom(atom);
              if (chunks.length > 0) await vectors.index(chunks);
              return `${atom.category}/${atom.id}`;
            } catch { return null; }
          };
          await selfJournal(
            description,
            `${result.stats.linesAdded}+ ${result.stats.linesRemoved}- in ${result.filesChanged.length} files`,
            true,
            storeFn,
          );
        }

        // Feedback loop: pitfall on failure
        if (!result.success && result.error) {
          const storeFn = async (text: string, category: string): Promise<string | null> => {
            try {
              const atom = await store.findOrCreate(category as any, {
                text, category: category as any, confidence: "[臨]",
              }, { scope: "global" });
              return `${atom.category}/${atom.id}`;
            } catch { return null; }
          };
          await recordPitfall(description, result.error, storeFn);
        }

        const statusEmoji = result.success ? "✓" : result.reverted ? "↩" : "✗";
        return {
          text: [
            `## Self-Apply: ${statusEmoji} ${result.success ? "Success" : "Failed"}`,
            `Build: ${result.buildResult}`,
            result.commitHash ? `Commit: ${result.commitHash.slice(0, 9)}` : "",
            result.reverted ? "Auto-reverted: yes" : "",
            `Changed: ${result.filesChanged.join(", ") || "(none)"}`,
            `Stats: +${result.stats.linesAdded} -${result.stats.linesRemoved}`,
            result.error ? `\nError:\n${result.error}` : "",
          ].filter(Boolean).join("\n"),
        };
      }

      // ── /iterate journal ──
      if (subCmd === "journal") {
        if (!subArgs) return { text: "Usage: /iterate journal <summary>" };
        const storeFn = async (text: string, category: string): Promise<string | null> => {
          try {
            const atom = await store.findOrCreate(category as any, {
              text, category: category as any, confidence: "[臨]",
            }, { scope: "global" });
            const chunks = chunkAtom(atom);
            if (chunks.length > 0) await vectors.index(chunks);
            await store.updateMemoryIndex();
            return `${atom.category}/${atom.id}`;
          } catch { return null; }
        };

        const result = await selfJournal(subArgs, "", true, storeFn);
        return {
          text: result.stored
            ? `Journal entry stored: ${result.atomRef}`
            : `Journal failed: ${result.error ?? "unknown"}`,
        };
      }

      return {
        text: [
          "Usage: /iterate <subcommand>",
          "",
          "  status              — OETAV observation dashboard (health, evidence, proposals, outcomes)",
          "  approve <id>        — Approve a pending proposal for execution",
          "  reject <id> [reason]— Reject a pending proposal",
          "  history             — Show executed proposals + outcome verifications",
          "  analyze <path>      — Analyze source code at path",
          "  propose <desc>      — Prepare a modification proposal",
          "  apply [desc]        — Validate + build + commit current changes",
          "  journal <summary>   — Record an iteration note to memory",
        ].join("\n"),
      };
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Guest access management commands (Phase 4: Guest)
  // ──────────────────────────────────────────────────────────────────────────

  api.registerCommand({
    name: "request-access",
    description: "提請使用權限 — Guest 可用",
    requireAuth: false,
    handler: async (ctx) => {
      const senderId = ctx.senderId;
      const channel = ctx.channel ?? "unknown";
      if (!senderId) {
        return { text: "⚠️ 無法取得您的身份資訊。" };
      }

      const result = await submitAccessRequest(
        api.resolvePath(cfg.atomStorePath),
        senderId,
        channel,
        undefined, // displayName not available in PluginCommandContext
      );

      if (result.alreadyPending) {
        return { text: "⏳ 您已有待審核的權限申請，請等待 Owner 審核。" };
      }

      log.info(`ACCESS REQUEST: ${senderId} on ${channel}`);
      return {
        text: "✅ 權限申請已送出。Owner 會收到通知，請耐心等候審核。",
      };
    },
  });

  api.registerCommand({
    name: "approve-access",
    description: "核准權限申請 — Owner only",
    acceptsArgs: true,
    handler: async (ctx) => {
      // Permission: owner-only
      const senderLevel = resolvePermissionLevel(
        ctx.senderId, undefined, cfg, state.runtimeAdminIds, ctx.channel, state.systemIdentity,
      );
      if (senderLevel !== "owner") {
        return { text: "⛔ /approve-access requires owner permission." };
      }

      const targetId = ctx.args?.trim();
      if (!targetId) {
        return { text: "Usage: /approve-access <senderId>" };
      }

      const request = await approveAccessRequest(
        api.resolvePath(cfg.atomStorePath),
        targetId,
        ctx.senderId,
      );
      if (!request) {
        return { text: `⚠️ 找不到 ${targetId} 的待審核申請。` };
      }

      // Auto-add to pairing store allowlist
      try {
        const { addChannelAllowFromStoreEntry } = await import("openclaw/plugin-sdk");
        const channelId = request.platform as any;
        await addChannelAllowFromStoreEntry({
          channel: channelId,
          entry: targetId,
        });
        log.info(`ACCESS APPROVED: ${targetId} on ${request.platform} — added to allowlist`);
      } catch (err) {
        log.warn(`Failed to add ${targetId} to allowlist: ${err instanceof Error ? err.message : String(err)}`);
        return {
          text: `✅ 已核准 ${targetId} 的申請，但自動加入 allowlist 失敗。\n請手動執行: /allowlist add dm ${targetId} --channel ${request.platform}`,
        };
      }

      return {
        text: `✅ 已核准 ${targetId}（${request.platform}）的權限申請，已自動加入 allowlist。`,
      };
    },
  });

  api.registerCommand({
    name: "deny-access",
    description: "拒絕權限申請 — Owner only",
    acceptsArgs: true,
    handler: async (ctx) => {
      const senderLevel = resolvePermissionLevel(
        ctx.senderId, undefined, cfg, state.runtimeAdminIds, ctx.channel, state.systemIdentity,
      );
      if (senderLevel !== "owner") {
        return { text: "⛔ /deny-access requires owner permission." };
      }

      const targetId = ctx.args?.trim();
      if (!targetId) {
        return { text: "Usage: /deny-access <senderId>" };
      }

      const request = await denyAccessRequest(
        api.resolvePath(cfg.atomStorePath),
        targetId,
        ctx.senderId,
      );
      if (!request) {
        return { text: `⚠️ 找不到 ${targetId} 的待審核申請。` };
      }

      log.info(`ACCESS DENIED: ${targetId} on ${request.platform}`);
      return { text: `❌ 已拒絕 ${targetId}（${request.platform}）的權限申請。` };
    },
  });

  api.registerCommand({
    name: "pending-access",
    description: "列出待審核的權限申請 — Owner only",
    handler: async (ctx) => {
      const senderLevel = resolvePermissionLevel(
        ctx.senderId, undefined, cfg, state.runtimeAdminIds, ctx.channel, state.systemIdentity,
      );
      if (senderLevel !== "owner") {
        return { text: "⛔ /pending-access requires owner permission." };
      }

      const pending = await listPendingRequests(api.resolvePath(cfg.atomStorePath));
      if (pending.length === 0) {
        return { text: "📋 目前沒有待審核的權限申請。" };
      }

      const lines = pending.map((r, i) =>
        `${i + 1}. ${r.senderId} (${r.platform}${r.displayName ? ` — ${r.displayName}` : ""}) — ${r.requestedAt}`,
      );
      return {
        text: `📋 待審核權限申請 (${pending.length}):\n${lines.join("\n")}\n\n使用 /approve-access <senderId> 或 /deny-access <senderId>`,
      };
    },
  });
}

// ============================================================================
// CLI Registration
// ============================================================================

function registerCli(state: PluginState): void {
  const { store, vectors, recall, promotion, log, api } = state;

  api.registerCli(
    ({ program }) => {
      const cmd = program.command("atoms").description("Atomic memory management");

      cmd
        .command("list")
        .description("List all atoms")
        .option("-c, --category <cat>", "Filter by category")
        .action(async (opts) => {
          const atoms = await store.list(opts.category);
          for (const a of atoms) {
            log.info(`${a.confidence} ${a.category}/${a.id} [${a.triggers.join(", ")}] last:${a.lastUsed} c:${a.confirmations}`);
          }
          log.info(`Total: ${atoms.length} atoms`);
        });

      cmd
        .command("search")
        .description("Search atoms via vector similarity")
        .argument("<query>", "Search query")
        .option("-n, --limit <n>", "Max results", "5")
        .action(async (query, opts) => {
          const results = await recall.search(query, { topK: parseInt(opts.limit) });
          for (const r of results) {
            log.info(`[${(r.score * 100).toFixed(0)}%] ${r.atom.confidence} ${r.atom.category}/${r.atom.id}`);
            log.info(`  ${r.atom.knowledge.slice(0, 120)}`);
          }
          if (results.length === 0) log.info("No results.");
        });

      cmd
        .command("stats")
        .description("Show memory statistics")
        .action(async () => {
          const atoms = await store.list();
          const byCategory: Record<string, number> = {};
          const byConfidence: Record<string, number> = {};

          for (const a of atoms) {
            byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
            byConfidence[a.confidence] = (byConfidence[a.confidence] ?? 0) + 1;
          }

          log.info(`Total atoms: ${atoms.length}`);
          log.info("By category:");
          for (const [k, v] of Object.entries(byCategory)) {
            log.info(`  ${k}: ${v}`);
          }
          log.info("By confidence:");
          for (const [k, v] of Object.entries(byConfidence)) {
            log.info(`  ${k}: ${v}`);
          }

          try {
            const vectorCount = await vectors.count();
            log.info(`Vector chunks indexed: ${vectorCount}`);
          } catch {
            log.info("Vector index: unavailable");
          }
        });

      cmd
        .command("reindex")
        .description("Rebuild vector index from atom files")
        .action(async () => {
          log.info("Reindexing...");
          const atoms = await store.list();
          const allChunks = atoms.flatMap((a) => chunkAtom(a));
          await vectors.reindex(allChunks);
          await store.updateMemoryIndex();
          log.info(`Reindexed ${atoms.length} atoms (${allChunks.length} chunks)`);
        });

      cmd
        .command("promote")
        .description("Run promotion/decay checks")
        .action(async () => {
          const results = await promotion.checkPromotions();
          for (const r of results) {
            if (r.action !== "none") {
              log.info(`${r.action}: ${r.atomRef} ${r.from} → ${r.to} (c:${r.confirmations})`);
            }
          }

          const decayResults = await promotion.checkDecay();
          for (const r of decayResults) {
            if (r.action !== "none") {
              log.info(`${r.action}: ${r.atomRef} (${r.daysSinceUsed}d idle)`);
            }
          }
        });
    },
    { commands: ["atoms"] },
  );
}

// ============================================================================
// Service Registration
// ============================================================================

function registerService(state: PluginState): void {
  const { ollama, vectors, sessionState, log, api } = state;

  api.registerService({
    id: "atomic-memory",
    async start() {
      const ollamaOk = await ollama.isAvailable();
      if (!ollamaOk) {
        log.warn("Ollama not available — extraction disabled, recall degraded");
      }

      const vectorOk = await vectors.isAvailable();
      if (!vectorOk) {
        log.warn("ChromaDB not available — vector search disabled");
      }

      if (ollamaOk && vectorOk) {
        log.info("all services healthy");
      }
    },
    stop() {
      sessionState.dispose();
      log.info("stopped");
    },
  });
}

// ============================================================================
// Name Similarity (for entity merge suggestion)
// ============================================================================

/**
 * Simple name similarity: normalized common character ratio.
 * Handles CJK names (character overlap) and Latin names (case-insensitive).
 * Returns 0-1 where 1 = identical.
 */
function nameSimilarity(a: string, b: string): number {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1.0;
  if (al.length === 0 || bl.length === 0) return 0;

  // For short CJK names (2-4 chars), use character overlap
  const aChars = [...al];
  const bChars = [...bl];
  const aSet = new Set(aChars);
  const bSet = new Set(bChars);
  let common = 0;
  for (const c of aSet) {
    if (bSet.has(c)) common++;
  }
  const maxLen = Math.max(aSet.size, bSet.size);
  return common / maxLen;
}

// ============================================================================
// Plugin Definition
// ============================================================================

const atomicMemoryPlugin = {
  id: "atomic-memory",
  name: "Atomic Memory (人事時地物)",
  description: "Structured knowledge memory with confidence tiers and cross-session promotion",
  kind: "memory" as const,
  configSchema: atomicMemoryConfigSchema,

  register(api: OpenClawPluginApi) {
    const cfg: AtomicMemoryConfig = atomicMemoryConfigSchema.parse(api.pluginConfig);
    const resolvedStorePath = api.resolvePath(cfg.atomStorePath);

    // Initialize components
    const store = new AtomStore(resolvedStorePath);
    const ollama = new OllamaClient(
      cfg.ollama.baseUrl,
      cfg.ollama.embeddingModel,
      cfg.ollama.extractionModel,
    );
    const vectors = new VectorClient(cfg.chromadb.url, cfg.chromadb.collection, ollama);
    const recall = new RecallEngine(store, vectors, ollama);
    const capture = new CaptureEngine(
      store, vectors, ollama,
      cfg.capture.maxChars,
      cfg.capture.maxItems,
    );
    const promotion = new PromotionEngine(store);
    const sessionStateMgr = new SessionStateManager();
    const log = createLogger("core", api.logger as any);

    log.info(`registered (store: ${resolvedStorePath}, lazy init)`);

    // Build shared state
    const state: PluginState = {
      cfg,
      store,
      ollama,
      vectors,
      recall,
      capture,
      promotion,
      sessionState: sessionStateMgr,
      log,
      api,
      pendingReflectionSummary: null,
      pendingIterationReminder: null,
      pendingForget: null,
      testSession: {
        active: false,
        factCount: 0,
        lastTestTurn: 0,
        currentTurn: 0,
        askedCleanup: false,
      },
      runtimeAdminIds: [],
      systemIdentity: null,
      turnTouchedAtoms: [],
    };

    // Load System.Owner.json identity registry (non-blocking)
    loadSystemIdentity(cfg.systemIdentityPath).then(identity => {
      state.systemIdentity = identity;
      if (identity) {
        log.info(`System.Owner.json loaded: bot="${identity.bot.displayName}", owner="${identity.owner.displayName}", platforms=${Object.keys(identity.owner.platforms).join(",")}`);
      }
    }).catch(() => { /* ignore — fallback to config */ });

    // Load runtime admin IDs (non-blocking — will be available by first hook call)
    loadRuntimeAdmins(resolvedStorePath).then(ids => {
      state.runtimeAdminIds = ids;
      if (ids.length > 0) log.info(`loaded ${ids.length} runtime admins`);
    }).catch(() => { /* ignore — empty admin list is fine */ });

    // Register all subsystems
    registerHooks(state);
    registerTools(state);
    registerCommands(state);
    registerCli(state);
    registerService(state);
  },
};

export default atomicMemoryPlugin;
