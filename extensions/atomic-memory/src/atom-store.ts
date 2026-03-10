/**
 * Atom Store — File-system CRUD for atom markdown files.
 *
 * Manages atoms stored as individual .md files organized by category:
 *   ~/.openclaw/memory/atoms/{category}/{id}.md
 */

import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseAtom } from "./atom-parser.js";
import { serializeAtom, serializeMemoryIndex } from "./atom-writer.js";
import { ATOM_CATEGORIES, type Atom, type AtomCategory, type Confidence } from "./types.js";

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
    patch: Partial<Pick<Atom, "confidence" | "lastUsed" | "confirmations" | "tags" | "related" | "actions" | "sources">> & {
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
      atom.knowledge = atom.knowledge
        ? `${atom.knowledge}\n- ${patch.appendKnowledge}`
        : `- ${patch.appendKnowledge}`;
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

    rmSync(filePath);
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
   */
  async findOrCreate(
    category: AtomCategory,
    fact: { text: string; category: AtomCategory; confidence: Confidence },
    options?: { channel?: string; senderId?: string },
  ): Promise<Atom> {
    // Try to find existing atom by scanning triggers
    const existing = await this.list(category);
    for (const atom of existing) {
      for (const trigger of atom.triggers) {
        if (fact.text.includes(trigger) || trigger.includes(fact.text.slice(0, 20))) {
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
    }

    // Create new atom
    const id = slugify(fact.text);
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
      rmSync(join(testDir, f));
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
 * Generate a URL-safe slug from text.
 * Keeps CJK characters, replaces spaces with hyphens.
 */
function slugify(text: string): string {
  return text
    .trim()
    .slice(0, 40)
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*]/g, "") // Remove filesystem-unsafe chars
    .replace(/-+$/, "") // Trim trailing hyphens
    .toLowerCase();
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
