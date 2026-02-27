/**
 * OpenClaw Bridge Service
 * 統一後端：computer-use（截圖/滑鼠/鍵盤）、Claude CLI、通知
 * 純 Node.js，零 npm 依賴
 * 127.0.0.1:3847，Bearer token 認證
 */

const http = require("http");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");

// --- Configuration ---
const PORT = parseInt(process.env.BRIDGE_PORT || "3847", 10);
const HOST = "127.0.0.1";
const AUTH_TOKEN = process.env.BRIDGE_TOKEN || "openclaw-bridge-default-token";
const DEFAULT_CWD = process.env.BRIDGE_CWD || "C:\\OpenClawWorkspace";
const LOG_FILE = path.join(DEFAULT_CWD, "logs", "bridge.log");
const CLAUDE_CLI =
  process.env.CLAUDE_CLI ||
  path.join(
    process.env.USERPROFILE || "",
    ".vscode",
    "extensions",
    "anthropic.claude-code-2.1.59-win32-x64",
    "resources",
    "native-binary",
    "claude.exe"
  );

// Rate limiting
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
let requestTimestamps = [];

// Claude CLI queue
let claudeQueue = [];
let claudeRunning = false;
const CLAUDE_MAX_QUEUE = 3;
const CLAUDE_TIMEOUT_MS = 180_000;

// --- Logging ---
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}

// --- Auth check ---
function checkAuth(req) {
  const auth = req.headers["authorization"];
  return auth === `Bearer ${AUTH_TOKEN}`;
}

// --- Rate limit check ---
function checkRateLimit() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (requestTimestamps.length >= RATE_MAX) return false;
  requestTimestamps.push(now);
  return true;
}

// --- Read JSON body ---
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

// --- JSON response ---
function respond(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

// --- PowerShell executor ---
function runPowerShell(script, timeout = 15000) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
      ],
      { timeout, maxBuffer: 50 * 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout.trim());
      }
    );
  });
}

// ==============================
// Computer Use Endpoints
// ==============================

async function handleScreenshot(body) {
  const script = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$g.Dispose()
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
[Convert]::ToBase64String($ms.ToArray())
$ms.Dispose()
`;
  const base64 = await runPowerShell(script, 10000);
  return { success: true, image: base64, format: "png" };
}

async function handleClick(body) {
  const x = parseInt(body.x, 10) || 0;
  const y = parseInt(body.y, 10) || 0;
  const button = body.button || "left";
  const doubleClick = body.doubleClick || false;

  let flags;
  if (button === "right") {
    flags = doubleClick ? "0x0008;0x0010;0x0008;0x0010" : "0x0008;0x0010";
  } else {
    flags = doubleClick ? "0x0002;0x0004;0x0002;0x0004" : "0x0002;0x0004";
  }
  const events = flags
    .split(";")
    .map(
      (f) =>
        `[User32]::mouse_event(${f}, 0, 0, 0, [UIntPtr]::Zero)`
    )
    .join("; Start-Sleep -Milliseconds 50; ");

  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class User32 {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
"@
[User32]::SetCursorPos(${x}, ${y})
Start-Sleep -Milliseconds 50
${events}
`;
  await runPowerShell(script, 5000);
  return { success: true, action: "click", x, y, button };
}

async function handleType(body) {
  const text = String(body.text || "");
  if (!text) return { success: false, error: "No text provided" };

  // Use clipboard + Ctrl+V for reliable text input (handles unicode, special chars)
  const escaped = text.replace(/'/g, "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Set-Clipboard -Value '${escaped}'
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait("^v")
`;
  await runPowerShell(script, 5000);
  return { success: true, action: "type", length: text.length };
}

async function handleKey(body) {
  const key = String(body.key || "");
  if (!key) return { success: false, error: "No key provided" };

  // Map modifier+key format to SendKeys format
  // Input: "ctrl+shift+p", "enter", "ctrl+v", "tab"
  const keyMap = {
    enter: "{ENTER}",
    tab: "{TAB}",
    escape: "{ESC}",
    esc: "{ESC}",
    backspace: "{BS}",
    delete: "{DEL}",
    up: "{UP}",
    down: "{DOWN}",
    left: "{LEFT}",
    right: "{RIGHT}",
    home: "{HOME}",
    end: "{END}",
    pageup: "{PGUP}",
    pagedown: "{PGDN}",
    space: " ",
    f1: "{F1}",
    f2: "{F2}",
    f3: "{F3}",
    f4: "{F4}",
    f5: "{F5}",
    f6: "{F6}",
    f7: "{F7}",
    f8: "{F8}",
    f9: "{F9}",
    f10: "{F10}",
    f11: "{F11}",
    f12: "{F12}",
  };

  const parts = key.toLowerCase().split("+");
  let modifiers = "";
  let mainKey = "";

  for (const part of parts) {
    if (part === "ctrl" || part === "control") modifiers += "^";
    else if (part === "alt") modifiers += "%";
    else if (part === "shift") modifiers += "+";
    else mainKey = keyMap[part] || part;
  }

  const sendKeysStr = modifiers + mainKey;
  const escaped = sendKeysStr.replace(/'/g, "''");
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${escaped}')
`;
  await runPowerShell(script, 5000);
  return { success: true, action: "key", key, sendKeys: sendKeysStr };
}

async function handleWindowFocus(body) {
  const processName = String(body.processName || "");
  if (!processName) return { success: false, error: "No processName provided" };

  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$proc = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($proc) {
  [WinAPI]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
  [WinAPI]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
  Write-Output "focused:$($proc.ProcessName):$($proc.MainWindowTitle)"
} else {
  Write-Output "not_found"
}
`;
  const result = await runPowerShell(script, 5000);
  if (result === "not_found") {
    return { success: false, error: `Process '${processName}' not found or has no window` };
  }
  return { success: true, action: "focus", result };
}

async function handleWindowList() {
  const script = `
Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | ForEach-Object {
  "$($_.ProcessName)|$($_.Id)|$($_.MainWindowTitle)"
} | ConvertTo-Json -Compress
`;
  const result = await runPowerShell(script, 5000);
  let windows;
  try {
    const parsed = JSON.parse(result);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    windows = arr.map((line) => {
      const [name, pid, title] = String(line).split("|");
      return { processName: name, pid: parseInt(pid, 10), title };
    });
  } catch {
    windows = [];
  }
  return { success: true, windows };
}

async function handleClipboard(body) {
  const text = String(body.text || "");
  const escaped = text.replace(/'/g, "''");
  const script = `Set-Clipboard -Value '${escaped}'`;
  await runPowerShell(script, 3000);
  return { success: true, action: "clipboard", length: text.length };
}

// ==============================
// Claude CLI Endpoint
// ==============================

function processClaudeQueue() {
  if (claudeRunning || claudeQueue.length === 0) return;
  claudeRunning = true;
  const { body, resolve } = claudeQueue.shift();

  const prompt = String(body.prompt || "");
  const cwd = body.workingDirectory || body.cwd || DEFAULT_CWD;
  const startTime = Date.now();

  const args = ["-p", prompt, "--output-format", "json", "--max-turns", "20"];

  log(`Claude CLI start: "${prompt.slice(0, 100)}..." cwd=${cwd}`);

  execFile(
    CLAUDE_CLI,
    args,
    {
      cwd,
      timeout: CLAUDE_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    },
    (err, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      claudeRunning = false;

      if (err) {
        const errMsg = err.killed
          ? `Timeout after ${CLAUDE_TIMEOUT_MS / 1000}s`
          : err.message;
        log(`Claude CLI error (${durationMs}ms): ${errMsg}`);
        resolve({ success: false, error: errMsg, durationMs });
      } else {
        let result;
        try {
          const parsed = JSON.parse(stdout);
          result = parsed.result || stdout;
        } catch {
          result = stdout;
        }
        log(`Claude CLI done (${durationMs}ms): ${result.length} chars`);
        resolve({ success: true, result, durationMs });
      }

      // Process next in queue
      setImmediate(processClaudeQueue);
    }
  );
}

async function handleClaudeExecute(body) {
  if (!body.prompt) return { success: false, error: "No prompt provided" };
  if (claudeQueue.length >= CLAUDE_MAX_QUEUE) {
    return { success: false, error: `Queue full (${CLAUDE_MAX_QUEUE} pending)` };
  }

  return new Promise((resolve) => {
    claudeQueue.push({ body, resolve });
    processClaudeQueue();
  });
}

// ==============================
// Notification Endpoints
// ==============================

async function handleNotifyDiscord(body) {
  const channelId = String(body.channelId || "");
  const message = String(body.message || "");
  if (!channelId || !message) {
    return { success: false, error: "channelId and message required" };
  }

  // Read Discord token from openclaw.json
  let token;
  try {
    const configPath = path.join(
      process.env.USERPROFILE || "",
      ".openclaw",
      "openclaw.json"
    );
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    token = config?.channels?.discord?.token;
  } catch (e) {
    return { success: false, error: "Cannot read Discord token from openclaw.json" };
  }

  if (!token) return { success: false, error: "Discord token not found" };

  const res = await fetch("https://discord.com/api/v10/channels/" + channelId + "/messages", {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: message }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { success: false, error: `Discord API ${res.status}: ${errBody}` };
  }

  return { success: true, action: "discord_notify", channelId };
}

async function handleNotifyLine(body) {
  const userId = String(body.userId || "");
  const message = String(body.message || "");
  if (!userId || !message) {
    return { success: false, error: "userId and message required" };
  }

  let token;
  try {
    const configPath = path.join(
      process.env.USERPROFILE || "",
      ".openclaw",
      "openclaw.json"
    );
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    token = config?.channels?.line?.token;
  } catch (e) {
    return { success: false, error: "Cannot read LINE token from openclaw.json" };
  }

  if (!token) return { success: false, error: "LINE token not found" };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { success: false, error: `LINE API ${res.status}: ${errBody}` };
  }

  return { success: true, action: "line_notify", userId };
}

// ==============================
// Router
// ==============================

const routes = {
  "GET /health": async () => ({
    status: "ok",
    uptime: process.uptime(),
    claudeQueueDepth: claudeQueue.length,
    claudeRunning,
  }),
  "POST /computer/screenshot": handleScreenshot,
  "POST /computer/click": handleClick,
  "POST /computer/type": handleType,
  "POST /computer/key": handleKey,
  "POST /computer/window-focus": handleWindowFocus,
  "POST /computer/window-list": handleWindowList,
  "POST /computer/clipboard": handleClipboard,
  "POST /claude/execute": handleClaudeExecute,
  "POST /notify/discord": handleNotifyDiscord,
  "POST /notify/line": handleNotifyLine,
};

// ==============================
// Server
// ==============================

const server = http.createServer(async (req, res) => {
  // CORS (for local dev)
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Auth (skip for health check)
  const routeKey = `${req.method} ${req.url}`;
  if (routeKey !== "GET /health" && !checkAuth(req)) {
    return respond(res, 401, { error: "Unauthorized" });
  }

  // Rate limit
  if (!checkRateLimit()) {
    return respond(res, 429, { error: "Rate limit exceeded" });
  }

  // Route
  const handler = routes[routeKey];
  if (!handler) {
    return respond(res, 404, { error: `Unknown route: ${routeKey}` });
  }

  try {
    let body = {};
    if (req.method === "POST") {
      body = await readBody(req);
    }
    log(`${routeKey} ${JSON.stringify(body).slice(0, 200)}`);
    const result = await handler(body);
    respond(res, 200, result);
  } catch (err) {
    log(`Error on ${routeKey}: ${err.message}`);
    respond(res, 500, { success: false, error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  log(`Bridge service started on ${HOST}:${PORT}`);
  log(`Auth token: ${AUTH_TOKEN.slice(0, 4)}...`);
  log(`Claude CLI: ${CLAUDE_CLI}`);
  log(`Default CWD: ${DEFAULT_CWD}`);
});
