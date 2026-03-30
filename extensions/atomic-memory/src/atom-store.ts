/**
 * Atom Store — File-system CRUD for atom markdown files.
 *
 * Manages atoms stored as individual .md files organized by category:
 *   ~/.openclaw/memory/atoms/{category}/{id}.md
 */

import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseAtom } from "./atom-parser.js";
import { serializeAtom, serializeMemoryIndex } from "./atom-writer.js";
import { ATOM_CATEGORIES, type Atom, type AtomCategory, type AtomScope, type Confidence } from "./types.js";
import { resolveEntity } from "./entity-resolver.js";

export class AtomStore {
  constructor(private readonly basePath: string) {
    this.ensureDirs();
  }

  /** Ensure all category directories exist. */
  private ensureDirs(): void {
    for (const cat of ATOM_CATEGORIES) {
      const dir = join(this.basePath, cat);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
    // Distant archive
    const distantDir = join(this.basePath, "_distant");
    if (!existsSync(distantDir)) {
      mkdirSync(distantDir, { recursive: true });
    }
    // Test atom area
    const testDir = join(this.basePath, "_test");
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    // Subsystem directories for future sessions
    for (const sub of ["episodic", "wisdom", "_iteration", "_actr"]) {
      const dir = join(this.basePath, sub);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /** Resolve path for an atom file. */
  private atomPath(category: AtomCategory, id: string): string {
    return join(this.basePath, category, `${id}.md`);
  }

  // ==========================================================================
  // Read operations
  // ==========================================================================

  /** List all atoms, optionally filtered by category. */
  async list(category?: AtomCategory): Promise<Atom[]> {
    const categories = category ? [category] : [...ATOM_CATEGORIES];
    const atoms: Atom[] = [];

    for (const cat of categories) {
      const dir = join(this.basePath, cat);
      if (!existsSync(dir)) continue;

      const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const filePath = join(dir, file);
        try {
          const content = await readFile(filePath, "utf-8");
          const id = basename(file, ".md");
          atoms.push(parseAtom(content, id, cat as AtomCategory));
        } catch {
          // Skip unreadable files
        }
      }
    }

    return atoms;
  }

  /** Get a single atom by category and id. Returns null if not found. */
  async get(category: AtomCategory, id: string): Promise<Atom | null> {
    const filePath = this.atomPath(category, id);
    if (!existsSync(filePath)) return null;

    try {
      const content = await readFile(filePath, "utf-8");
      return parseAtom(content, id, category);
    } catch {
      return null;
    }
  }

  /** Check if an atom exists. */
  exists(category: AtomCategory, id: string): boolean {
    return existsSync(this.atomPath(category, id));
  }

  // ==========================================================================
  // Write operations
  // ==========================================================================

  /** Create a new atom. Throws if already exists. */
  async create(atom: Atom): Promise<Atom> {
    const filePath = this.atomPath(atom.category, atom.id);
    if (existsSync(filePath)) {
      throw new Error(`Atom already exists: ${atom.category}/${atom.id}`);
    }

    const content = serializeAtom(atom);
    // Atomic write: write to temp then rename
    const tmpPath = filePath + ".tmp";
    writeFileSync(tmpPath, content, "utf-8");
    renameSync(tmpPath, filePath);

    return atom;
  }

  /** Update an existing atom with a partial patch. */
  async update(
    category: AtomCategory,
    id: string,
    patch: Partial<Pick<Atom, "confidence" | "lastUsed" | "confirmations" | "tags" | "related" | "actions" | "sources" | "triggers">> & {
      appendKnowledge?: string;
      appendEvolution?: string;
    },
  ): Promise<Atom | null> {
    const atom = await this.get(category, id);
    if (!atom) return null;

    // Apply patches
    if (patch.confidence !== undefined) atom.confidence = patch.confidence;
    if (patch.lastUsed !== undefined) atom.lastUsed = patch.lastUsed;
    if (patch.confirmations !== undefined) atom.confirmations = patch.confirmations;
    if (patch.tags !== undefined) atom.tags = patch.tags;
    if (patch.related !== undefined) atom.related = patch.related;
    if (patch.actions !== undefined) atom.actions = patch.actions;
    if (patch.triggers !== undefined) atom.triggers = patch.triggers;

    if (patch.sources) {
      // Merge sources, avoid duplicates
      for (const src of patch.sources) {
        const exists = atom.sources.some(
          (s) => s.channel === src.channel && s.senderId === src.senderId,
        );
        if (!exists) atom.sources.push(src);
      }
    }

    if (patch.appendKnowledge) {
      // Dedup: skip if near-identical knowledge line already exists
      if (!atom.knowledge || !knowledgeContainsDuplicate(atom.knowledge, patch.appendKnowledge)) {
        atom.knowledge = atom.knowledge
          ? `${atom.knowledge}\n- ${patch.appendKnowledge}`
          : `- ${patch.appendKnowledge}`;
      }
    }

    if (patch.appendEvolution) {
      atom.evolutionLog.push(patch.appendEvolution);
    }

    // Write back
    const filePath = this.atomPath(category, id);
    const content = serializeAtom(atom);
    const tmpPath = filePath + ".tmp";
    writeFileSync(tmpPath, content, "utf-8");
    renameSync(tmpPath, filePath);

    return atom;
  }

  /** Delete an atom permanently. */
  async delete(category: AtomCategory, id: string): Promise<boolean> {
    const filePath = this.atomPath(category, id);
    if (!existsSync(filePath)) return false;

    unlinkSync(filePath);
    return true;
  }

  /** Move an atom to the _distant/ archive. */
  async moveToDistant(category: AtomCategory, id: string): Promise<boolean> {
    const filePath = this.atomPath(category, id);
    if (!existsSync(filePath)) return false;

    const now = new Date();
    const yearMonth = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
    const distantDir = join(this.basePath, "_distant", yearMonth);
    if (!existsSync(distantDir)) {
      mkdirSync(distantDir, { recursive: true });
    }

    const destPath = join(distantDir, `${category}-${id}.md`);
    renameSync(filePath, destPath);
    return true;
  }

  // ==========================================================================
  // Find or create
  // ==========================================================================

  /**
   * Find an existing atom that matches the given fact, or create a new one.
   * For person atoms, tries to match by trigger keywords.
   * For other categories, creates new atom if no close match found.
   *
   * V2.5.1: Tightened trigger matching + knowledge dedup before append.
   */
  async findOrCreate(
    category: AtomCategory,
    fact: { text: string; category: AtomCategory; confidence: Confidence },
    options?: { channel?: string; senderId?: string; scope?: AtomScope },
  ): Promise<Atom> {
    // Try to find existing atom by scanning triggers
    const existing = await this.list(category);
    for (const atom of existing) {
      for (const trigger of atom.triggers) {
        // Require trigger length ≥ 2 and bidirectional containment with min overlap
        if (trigger.length < 2) continue;
        const matched =
          (fact.text.includes(trigger) && trigger.length >= 3) ||
          (trigger.length >= 8 && trigger.includes(fact.text.slice(0, 20)));
        if (!matched) continue;

        // Dedup: skip if identical or near-identical knowledge line already exists
        if (atom.knowledge && knowledgeContainsDuplicate(atom.knowledge, fact.text)) {
          // Already recorded — just touch lastUsed
          await this.update(category, atom.id, {
            lastUsed: new Date().toISOString().slice(0, 10),
          });
          return (await this.get(category, atom.id))!;
        }

        // Append to existing atom
        await this.update(category, atom.id, {
          appendKnowledge: fact.text,
          lastUsed: new Date().toISOString().slice(0, 10),
          appendEvolution: `${new Date().toISOString().slice(0, 10)}: 新增知識 — ${fact.text.slice(0, 40)}`,
          ...(options?.channel
            ? { sources: [{ channel: options.channel, senderId: options.senderId }] }
            : {}),
        });
        return (await this.get(category, atom.id))!;
      }
    }

    // Create new atom
    const id = generateSemanticSlug(fact.text, fact.category);
    const today = new Date().toISOString().slice(0, 10);

    const newAtom: Atom = {
      id,
      title: fact.text.slice(0, 60),
      category,
      confidence: fact.confidence,
      triggers: extractTriggers(fact.text),
      lastUsed: today,
      confirmations: 0,
      tags: [],
      related: [],
      sources: options?.channel
        ? [{ channel: options.channel, senderId: options.senderId }]
        : [],
      scope: options?.scope ?? "global",
      knowledge: `- ${fact.text}`,
      actions: "",
      evolutionLog: [`${today}: 建立`],
    };

    return this.create(newAtom);
  }

  // ==========================================================================
  // Index management
  // ==========================================================================

  /** Rebuild the MEMORY.md index file. */
  async updateMemoryIndex(): Promise<void> {
    const atoms = await this.list();
    const content = serializeMemoryIndex(atoms);
    const indexPath = join(this.basePath, "MEMORY.md");
    writeFileSync(indexPath, content, "utf-8");
  }

  /** Get the base path of the atom store. */
  getBasePath(): string {
    return this.basePath;
  }

  /** Find a person atom matching the given sender identity. */
  async findPersonBySender(senderId: string, channel: string, displayName?: string): Promise<Atom | null> {
    const personAtoms = await this.list("person");
    return resolveEntity(senderId, channel, displayName, personAtoms);
  }

  // ==========================================================================
  // Test atom operations
  // ==========================================================================

  /** Store a fact in the _test/ area (isolated from real atoms). */
  async storeTest(fact: { text: string; category: AtomCategory; confidence: Confidence }): Promise<string> {
    const testDir = join(this.basePath, "_test");
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    const id = `test-${slugify(fact.text)}`;
    const filePath = join(testDir, `${id}.md`);
    const today = new Date().toISOString().slice(0, 10);
    const content = `# ${fact.text.slice(0, 60)}\n\n- Scope: test\n- Category: ${fact.category}\n- Created: ${today}\n\n## 知識\n\n- ${fact.text}\n`;
    writeFileSync(filePath, content, "utf-8");
    return id;
  }

  /** Clear all test atoms. Returns the number of files removed. */
  clearTestAtoms(): number {
    const testDir = join(this.basePath, "_test");
    if (!existsSync(testDir)) return 0;
    const files = readdirSync(testDir).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      unlinkSync(join(testDir, f));
    }
    return files.length;
  }

  /** Count test atoms. */
  countTestAtoms(): number {
    const testDir = join(this.basePath, "_test");
    if (!existsSync(testDir)) return 0;
    return readdirSync(testDir).filter((f) => f.endsWith(".md")).length;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Tokenize text for dedup comparison.
 * CJK characters are split into bigrams; English words are kept as-is.
 */
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  const lower = text.toLowerCase();

  // Extract English words (3+ chars)
  for (const m of lower.matchAll(/[a-z][a-z0-9]{2,}/g)) {
    tokens.add(m[0]);
  }

  // Extract CJK bigrams (overlapping pairs for better granularity)
  const cjk = lower.replace(/[^\u4e00-\u9fff]/g, "");
  for (let i = 0; i < cjk.length - 1; i++) {
    tokens.add(cjk.slice(i, i + 2));
  }

  // Digits (3+ consecutive)
  for (const m of lower.matchAll(/\d{3,}/g)) {
    tokens.add(m[0]);
  }

  return tokens;
}

/**
 * Check if the existing knowledge section already contains a near-duplicate of newText.
 * Uses token overlap scoring (CJK bigrams + English words).
 */
function knowledgeContainsDuplicate(existingKnowledge: string, newText: string): boolean {
  const newTokens = tokenize(newText);
  if (newTokens.size === 0) return true; // empty fact — treat as dup

  for (const line of existingKnowledge.split("\n")) {
    const trimmed = line.replace(/^-\s*/, "").trim();
    if (trimmed.length < 5) continue;

    const lineTokens = tokenize(trimmed);
    if (lineTokens.size === 0) continue;

    // Token overlap ratio (against the smaller set)
    let overlap = 0;
    for (const t of newTokens) {
      if (lineTokens.has(t)) overlap++;
    }
    const ratio = overlap / Math.min(newTokens.size, lineTokens.size);
    if (ratio >= 0.80) return true;
  }
  return false;
}

/**
 * Generate a semantic slug for atom filenames.
 *
 * Strategy: extract key entities (proper nouns, CJK names, technical terms)
 * and compose a readable kebab-case slug. Falls back to truncated text only
 * if no entities are found.
 */
function generateSemanticSlug(text: string, category: AtomCategory): string {
  const parts: string[] = [];

  // 1. Extract English proper nouns and tech terms
  const englishEntities = text.match(/[A-Z][a-zA-Z]{2,}/g);
  if (englishEntities) {
    for (const e of englishEntities.slice(0, 2)) {
      parts.push(e.toLowerCase());
    }
  }

  // 2. Extract CJK named entities (after relationship markers)
  const cjkEntityPatterns = [
    /(?:叫做?|名(?:字|為)|稱為)\s*([\u4e00-\u9fff]{1,8})/g,
    /(?:住在|位於|搬到)\s*([\u4e00-\u9fff]{2,8})/g,
  ];
  for (const pattern of cjkEntityPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      parts.push(match[1]);
    }
  }

  // 3. Extract CJK subject-verb-object core
  const svoMatch = text.match(/([\u4e00-\u9fff]{2,4})(?:決定|使用|設定|偏好|負責|喜歡|住在)([\u4e00-\u9fff]{2,6})/);
  if (svoMatch) {
    if (!parts.includes(svoMatch[1])) parts.push(svoMatch[1]);
    if (!parts.includes(svoMatch[2])) parts.push(svoMatch[2]);
  }

  // 4. Fallback: first meaningful CJK phrases
  if (parts.length === 0) {
    const cjkPhrases = text.match(/[\u4e00-\u9fff]{2,6}/g);
    if (cjkPhrases) {
      for (const p of cjkPhrases.slice(0, 2)) {
        if (!parts.includes(p)) parts.push(p);
      }
    }
  }

  // 5. Fallback: ASCII words
  if (parts.length === 0) {
    const words = text.replace(/[^\w]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
    parts.push(...words.slice(0, 3));
  }

  // Compose slug
  let slug = parts
    .join("-")
    .replace(/[<>:"/\\|?*`]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  // Ensure reasonable length (max 40 chars)
  if (slug.length > 40) slug = slug.slice(0, 40).replace(/-+$/, "");

  // Last resort: category + timestamp
  if (!slug || slug.length < 2) {
    slug = `${category}-${Date.now().toString(36)}`;
  }

  return slug;
}

/**
 * Common filler words that have no recall value as triggers.
 */
const CJK_FILLERS = new Set([
  "使用者", "要求", "記住", "提供", "更新", "資訊", "可以", "應該",
  "已經", "需要", "目前", "喜歡", "討厭", "偏好", "認為", "覺得",
  "知道", "不是", "沒有", "表示", "補充", "確認", "建議", "最喜歡",
  "今天", "最新", "簡述", "更完整", "更新資訊", "再次確認",
]);

/**
 * Extract potential trigger keywords from a fact text.
 * Uses entity-aware extraction: looks after structural markers (叫/住在/是)
 * for the actual subject/object, excludes filler words.
 */
function extractTriggers(text: string): string[] {
  const triggers: string[] = [];
  const addTrigger = (t: string) => {
    const trimmed = t.trim();
    if (trimmed.length >= 2 && !CJK_FILLERS.has(trimmed) && !triggers.includes(trimmed)) {
      triggers.push(trimmed);
    }
  };

  // 1. Extract named entities after relationship markers
  const entityPatterns = [
    /(?:叫做?|名字(?:是|叫做?)?|名為|稱為)\s*([^\s，。、,！!]{1,8})/g,   // names
    /(?:住在|位於|搬到)\s*([^\s，。、,！!]{2,8})/g,                       // places
    /(?:養了|養的|有一隻|有一個)\s*([^\s，。、,！!]{1,6})/g,              // possessions
  ];
  for (const pattern of entityPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      addTrigger(match[1]);
    }
  }

  // 2. English proper nouns and technical terms (TypeScript, ChromaDB, etc.)
  const techMatches = text.match(/[A-Z][a-zA-Z]{2,}(?:#[a-zA-Z]+)*/g);
  if (techMatches) {
    for (const m of techMatches.slice(0, 3)) {
      addTrigger(m);
    }
  }

  // 3. Fallback: CJK phrases not in filler set
  if (triggers.length < 2) {
    const cjkMatches = text.match(/[\u4e00-\u9fff]{2,6}/g);
    if (cjkMatches) {
      for (const m of cjkMatches) {
        if (!CJK_FILLERS.has(m) && triggers.length < 5) {
          addTrigger(m);
        }
      }
    }
  }

  // 4. Last resort: first 20 meaningful chars
  if (triggers.length === 0) {
    const first = text.slice(0, 20).trim();
    if (first) triggers.push(first);
  }

  return triggers.slice(0, 5);
}
