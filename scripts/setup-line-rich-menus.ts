#!/usr/bin/env npx tsx
/**
 * Setup LINE Rich Menus — creates 3 tiered menus (owner / admin / user)
 * and optionally sets the user-level menu as the default.
 *
 * Usage:
 *   npx tsx scripts/setup-line-rich-menus.ts [--set-default] [--account <id>]
 *
 * After running, copy the output richMenuIds into openclaw.json:
 *   channels.line.richMenus: { owner: "...", admin: "...", user: "..." }
 *
 * Images:
 *   Place 2500×843 PNGs at:
 *     assets/line-rich-menu-owner.png
 *     assets/line-rich-menu-admin.png
 *     assets/line-rich-menu-user.png
 *   If images are missing, menus are created without images (add later via
 *   LINE Official Account Manager or the uploadRichMenuImage API).
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
  deleteRichMenu,
  getRichMenuList,
  createGridLayout,
  type CreateRichMenuParams,
} from "../src/line/rich-menu.js";
import { messageAction, postbackAction } from "../src/line/actions.js";

// ---------------------------------------------------------------------------
// Menu Definitions
// ---------------------------------------------------------------------------

const MENU_HEIGHT = 843 as const;

/** Owner: full control — config, restart, approve, debug + admin/user features */
function ownerMenuDef(): CreateRichMenuParams {
  return {
    size: { width: 2500, height: MENU_HEIGHT },
    selected: false,
    name: "OpenClaw Owner",
    chatBarText: "Owner Menu",
    areas: createGridLayout(MENU_HEIGHT, [
      // Row 1 — power tools
      postbackAction("⚙ Config", "/config", "/config"),
      postbackAction("🔄 Restart", "/restart", "/restart"),
      postbackAction("✅ Approve", "/approve", "/approve"),
      // Row 2 — admin + user basics
      postbackAction("🐛 Debug", "/debug", "/debug"),
      postbackAction("📊 Status", "/status", "/status"),
      messageAction("💬 Help", "/help"),
    ]),
  };
}

/** Admin: management — session, model, subagents, activation + user features */
function adminMenuDef(): CreateRichMenuParams {
  return {
    size: { width: 2500, height: MENU_HEIGHT },
    selected: false,
    name: "OpenClaw Admin",
    chatBarText: "Admin Menu",
    areas: createGridLayout(MENU_HEIGHT, [
      // Row 1 — management
      postbackAction("📋 Session", "/session", "/session"),
      postbackAction("🤖 Model", "/model", "/model"),
      postbackAction("👥 Subagents", "/subagents", "/subagents"),
      // Row 2 — user basics
      postbackAction("📊 Status", "/status", "/status"),
      messageAction("🆕 New", "/new"),
      messageAction("💬 Help", "/help"),
    ]),
  };
}

/** User: basics — help, status, new session, tts, compact */
function userMenuDef(): CreateRichMenuParams {
  return {
    size: { width: 2500, height: MENU_HEIGHT },
    selected: false,
    name: "OpenClaw User",
    chatBarText: "Menu",
    areas: createGridLayout(MENU_HEIGHT, [
      // Row 1
      messageAction("💬 Help", "/help"),
      postbackAction("📊 Status", "/status", "/status"),
      messageAction("🆕 New", "/new"),
      // Row 2
      postbackAction("🔊 TTS", "/tts", "/tts"),
      postbackAction("📦 Compact", "/compact", "/compact"),
      postbackAction("🛑 Stop", "/stop", "/stop"),
    ]),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ASSETS_DIR = resolve(import.meta.dirname ?? ".", "../assets");

async function tryUploadImage(richMenuId: string, imageName: string, opts: { accountId?: string }) {
  const imagePath = resolve(ASSETS_DIR, imageName);
  if (!existsSync(imagePath)) {
    console.log(`  ⚠ Image not found: ${imagePath} — skipping upload`);
    return;
  }
  await uploadRichMenuImage(richMenuId, imagePath, { accountId: opts.accountId, verbose: true });
  console.log(`  ✓ Uploaded image for ${richMenuId}`);
}

async function main() {
  const args = process.argv.slice(2);
  const setDefault = args.includes("--set-default");
  const accountIdx = args.indexOf("--account");
  const accountId = accountIdx >= 0 ? args[accountIdx + 1] : undefined;

  const opts = { accountId, verbose: true };

  console.log("=== LINE Rich Menu Setup ===\n");

  // Show existing menus
  const existing = await getRichMenuList(opts);
  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing rich menu(s):`);
    for (const m of existing) {
      console.log(`  - ${m.richMenuId} "${m.name}" (${m.chatBarText})`);
    }
    console.log();
  }

  // Create menus
  const menus: Array<{ level: string; def: CreateRichMenuParams; image: string }> = [
    { level: "owner", def: ownerMenuDef(), image: "line-rich-menu-owner.png" },
    { level: "admin", def: adminMenuDef(), image: "line-rich-menu-admin.png" },
    { level: "user", def: userMenuDef(), image: "line-rich-menu-user.png" },
  ];

  const results: Record<string, string> = {};

  for (const { level, def, image } of menus) {
    console.log(`Creating ${level} menu...`);
    const richMenuId = await createRichMenu(def, opts);
    console.log(`  ✓ Created: ${richMenuId}`);
    results[level] = richMenuId;

    await tryUploadImage(richMenuId, image, opts);
  }

  // Optionally set user menu as default (for users without per-user binding)
  if (setDefault && results.user) {
    console.log(`\nSetting user menu as default...`);
    await setDefaultRichMenu(results.user, opts);
    console.log(`  ✓ Default set to ${results.user}`);
  }

  // Output config snippet
  console.log("\n=== Done! Add to openclaw.json ===\n");
  console.log(`"channels": {`);
  console.log(`  "line": {`);
  console.log(`    "richMenus": {`);
  console.log(`      "owner": "${results.owner}",`);
  console.log(`      "admin": "${results.admin}",`);
  console.log(`      "user": "${results.user}"`);
  console.log(`    }`);
  console.log(`  }`);
  console.log(`}`);

  // Also output for easy clipboard
  console.log("\n--- JSON (copy-paste) ---");
  console.log(JSON.stringify({ owner: results.owner, admin: results.admin, user: results.user }, null, 2));
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
