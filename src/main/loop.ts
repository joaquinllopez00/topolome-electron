import { spawn, type ChildProcess } from "child_process";
import { BrowserWindow } from "electron";
import {
  DATA_ROOT,
  getConfig,
  listCategories,
  getCategoryMeta,
  itemFilePath,
  type Config,
  type CategoryMeta,
} from "./store";

/**
 * Drives the categorization agent from inside the app.
 *
 * The main process owns the schedule: a setInterval ticks every
 * `loop_interval_minutes`. Each tick runs a SEQUENCE of jobs: one shared "Main
 * loop" pass over all `main`-mode categories, then one dedicated pass per
 * `dedicated`-mode category. Jobs run sequentially.
 *
 * Overlap rule: if a tick's jobs are still running when the next tick fires,
 * that tick is SKIPPED — we never run two jobs at once and never kill an
 * in-flight one (killing mid-pass could leave half-written JSON in the data
 * dir). Stopping the loop lets the current job finish but launches no more.
 */

export interface LoopStatus {
  /** The interval scheduler is on. */
  enabled: boolean;
  /** A job is executing right now. */
  running: boolean;
  intervalMinutes: number;
  /** Label of the job currently running (e.g. "Main loop" or a category name). */
  activePass: string | null;
  /** 1-based index and total of jobs in the current tick. */
  passIndex: number | null;
  passTotal: number | null;
  lastRunAt: number | null;
  lastExitCode: number | null;
  lastError: string | null;
}

let timer: ReturnType<typeof setInterval> | null = null;
let child: ChildProcess | null = null;
/** True while a tick's job sequence is in flight (tick-level overlap guard). */
let ticking = false;
/** PATH as seen by a login shell — GUI apps don't inherit it (see resolveEnv). */
let cachedPath: string | null = null;

/** Rolling combined stdout+stderr log, capped so it can't grow unbounded. */
const MAX_LOG_CHARS = 100_000;
let logs = "";

export function getLoopLogs(): string {
  return logs;
}

function appendLog(chunk: string): void {
  logs = (logs + chunk).slice(-MAX_LOG_CHARS);
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("loop:output", chunk);
  }
}

const status: LoopStatus = {
  enabled: false,
  running: false,
  intervalMinutes: 10,
  activePass: null,
  passIndex: null,
  passTotal: null,
  lastRunAt: null,
  lastExitCode: null,
  lastError: null,
};

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("loop:status", status);
  }
}

export function getLoopStatus(): LoopStatus {
  return status;
}

/**
 * A GUI app launched from Finder/Dock does not inherit the user's shell PATH,
 * so `spawn('claude')` would throw ENOENT. Resolve PATH once via a login shell
 * and reuse it for every pass.
 */
async function resolveEnv(): Promise<NodeJS.ProcessEnv> {
  if (cachedPath === null) {
    cachedPath = await new Promise<string>((resolve) => {
      const shell = process.env.SHELL || "/bin/zsh";
      const probe = spawn(shell, ["-lc", "echo $PATH"]);
      let out = "";
      probe.stdout?.on("data", (d) => (out += d.toString()));
      probe.on("close", () => resolve(out.trim() || process.env.PATH || ""));
      probe.on("error", () => resolve(process.env.PATH || ""));
    });
  }
  return { ...process.env, PATH: cachedPath };
}

/** A category and its loaded sidecar manifest. */
interface CategoryEntry {
  name: string;
  meta: CategoryMeta;
}

/** The item-file contract, shared by every prompt so it stays consistent. */
function itemShapeSpec(categoryPath: string): string {
  return `Write each item as its own file at ${categoryPath}/<slug>.json with EXACTLY this shape:
     {
       "title": string,
       "description": string,
       "archived": false,
       "source": { "sourceFriendlyName": string, "linkToOpen"?: string },
       "suggestedAction"?: { "title": string, "sessionStartPrompt": string }
     }
   "source" records where the item came from: "sourceFriendlyName" is a short human label
   (e.g. "Slack #general"); "linkToOpen" is an optional URL or deep link that opens the
   original (e.g. a message permalink) — include it whenever one is available.
   "suggestedAction" is OPTIONAL — include it ONLY if the item is actionable (a concrete next
   step someone could take). "title" is a short imperative label (e.g. "Have an agent investigate");
   "sessionStartPrompt" is a ready-to-run prompt that would carry out that action in a Claude
   session. Omit "suggestedAction" entirely when the item is not actionable.
   Use a filesystem-safe slug of the title for <slug>.`;
}

function describe(meta: CategoryMeta): string {
  return meta.description.trim() || "(no description — infer from the category name)";
}
function sourcesOf(meta: CategoryMeta): string {
  return meta.sources.length ? meta.sources.join(", ") : "(no sources configured)";
}

/** The shared pass covering every `main`-mode category in one invocation. */
function buildMainPrompt(config: Config, cats: CategoryEntry[]): string {
  const operator = config.system_prompt.trim() || "(no operator instructions set)";
  const table = cats
    .map((c) => `- ${c.name}\n    belongs: ${describe(c.meta)}\n    sources: ${sourcesOf(c.meta)}`)
    .join("\n");
  const union = Array.from(new Set(cats.flatMap((c) => c.meta.sources)));
  const sourceList = union.length ? union.join(", ") : "(none configured — nothing to collect)";

  return `Act as topolome's categorization agent. Run exactly ONE pass over the categories below, then stop.

OPERATOR RULES (cross-cutting, from config.json → system_prompt):
${operator}

CATEGORIES (route each item using these per-category "belongs" rules):
${table}

THIS PASS:
1. Check these sources (the union of the categories' sources): ${sourceList}.
2. For each candidate item, test it against EACH category's "belongs" rule above.
   File it into every category it matches — an item may belong to more than one, so write a
   separate copy in each. Skip items that match no category.
3. ${itemShapeSpec(`${DATA_ROOT}/categories/<category>`)}
4. Dedupe WITHIN each category: before writing, read existing files there and skip items already
   present. Duplicates ACROSS categories are expected and fine.
5. Never delete, overwrite, or unarchive items you didn't create this pass.`;
}

/** A scoped pass for a single `dedicated`-mode category. */
function buildDedicatedPrompt(config: Config, entry: CategoryEntry): string {
  const operator = config.system_prompt.trim() || "(no operator instructions set)";
  const path = `${DATA_ROOT}/categories/${entry.name}`;

  return `Act as topolome's categorization agent for the single category "${entry.name}". Run exactly ONE pass, then stop.

OPERATOR RULES (cross-cutting, from config.json → system_prompt):
${operator}

THIS CATEGORY:
  belongs: ${describe(entry.meta)}
  sources: ${sourcesOf(entry.meta)}

THIS PASS:
1. Check this category's sources: ${sourcesOf(entry.meta)}.
2. For each candidate, decide if it matches the "belongs" rule above. Skip anything that doesn't.
3. ${itemShapeSpec(path)}
4. Dedupe: before writing, read existing files in this category and skip items already present.
5. Never delete, overwrite, or unarchive items you didn't create this pass.`;
}

/**
 * Turn one `stream-json` event line into a human-readable log line. Returns ''
 * for events we don't surface, and falls back to the raw line if it isn't JSON.
 */
function formatEvent(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  let event: {
    type?: string;
    subtype?: string;
    result?: string;
    total_cost_usd?: number;
    message?: { content?: Array<{ type?: string; text?: string; name?: string }> };
  };
  try {
    event = JSON.parse(trimmed);
  } catch {
    return trimmed; // not JSON — show it raw
  }

  switch (event.type) {
    case "system":
      return event.subtype === "init" ? "▸ session started" : "";
    case "assistant": {
      const parts: string[] = [];
      for (const block of event.message?.content ?? []) {
        if (block.type === "text" && block.text?.trim()) {
          parts.push(block.text.trim());
        } else if (block.type === "tool_use") {
          parts.push(`→ ${block.name}`);
        }
      }
      return parts.join("\n");
    }
    case "result": {
      const cost =
        typeof event.total_cost_usd === "number" ? ` ($${event.total_cost_usd.toFixed(4)})` : "";
      return `✓ ${event.subtype ?? "done"}${cost}`;
    }
    default:
      return "";
  }
}

/**
 * Spawn one headless agent job and resolve when it exits. Streams stream-json
 * events to the live log. Permission posture comes from config: under
 * acceptEdits anything beyond file edits (Bash, MCP reads) is auto-DENIED;
 * bypassPermissions grants full tool access. stdin is ignored so `claude -p`
 * doesn't stall waiting on it.
 */
function runJob(
  label: string,
  prompt: string,
  env: NodeJS.ProcessEnv,
  permissionMode: "acceptEdits" | "bypassPermissions",
): Promise<void> {
  return new Promise((resolve) => {
    child = spawn(
      "claude",
      ["-p", prompt, "--permission-mode", permissionMode, "--output-format", "stream-json", "--verbose"],
      { cwd: DATA_ROOT, env, stdio: ["ignore", "pipe", "pipe"] },
    );

    appendLog(`\n── ${label} started ${new Date().toLocaleTimeString()} ──\n`);

    let stderr = "";
    let stdoutBuffer = "";
    child.stdout?.on("data", (d) => {
      stdoutBuffer += d.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const formatted = formatEvent(line);
        if (formatted) appendLog(formatted + "\n");
      }
    });
    child.stderr?.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      appendLog(s);
    });

    child.on("error", (err) => {
      status.lastError = err.message;
      appendLog(`\n[error] ${err.message}\n`);
    });

    child.on("close", (code) => {
      child = null;
      status.lastExitCode = code;
      if (code !== 0) {
        status.lastError = stderr.trim().slice(-500) || `${label} exited with code ${code}`;
      }
      appendLog(`\n── ${label} finished (exit ${code}) ──\n`);
      resolve();
    });
  });
}

/** Build the ordered job list for a tick from the categories' loop modes. */
async function buildJobs(config: Config): Promise<{ label: string; prompt: string }[]> {
  const names = await listCategories();
  const entries: CategoryEntry[] = await Promise.all(
    names.map(async (name) => ({ name, meta: await getCategoryMeta(name) })),
  );

  const jobs: { label: string; prompt: string }[] = [];
  const mainCats = entries.filter((e) => e.meta.loopMode === "main");
  if (mainCats.length) jobs.push({ label: "Main loop", prompt: buildMainPrompt(config, mainCats) });
  for (const entry of entries.filter((e) => e.meta.loopMode === "dedicated")) {
    jobs.push({ label: entry.name, prompt: buildDedicatedPrompt(config, entry) });
  }
  return jobs;
}

/** Run one tick: all jobs in sequence. Skips if a prior tick is still running. */
async function runTick(): Promise<void> {
  if (ticking) return; // overlap guard at the tick level
  ticking = true;
  status.running = true;
  status.lastError = null;
  broadcast();

  try {
    const config = await getConfig();
    const env = await resolveEnv();
    const permissionMode =
      config.loop_permission_mode === "bypassPermissions" ? "bypassPermissions" : "acceptEdits";
    const jobs = await buildJobs(config);

    if (!jobs.length) {
      appendLog(`\n── tick skipped: no active categories ──\n`);
      return;
    }

    status.passTotal = jobs.length;
    for (let i = 0; i < jobs.length; i++) {
      // Stopping the loop lets the current job finish but launches no more.
      if (!status.enabled && i > 0) break;
      status.activePass = jobs[i].label;
      status.passIndex = i + 1;
      broadcast();
      await runJob(jobs[i].label, jobs[i].prompt, env, permissionMode);
    }
  } finally {
    ticking = false;
    status.running = false;
    status.activePass = null;
    status.passIndex = null;
    status.passTotal = null;
    status.lastRunAt = Date.now();
    broadcast();
  }
}

export async function startLoop(): Promise<LoopStatus> {
  const config = await getConfig();
  status.enabled = true;
  status.intervalMinutes = config.loop_interval_minutes;
  broadcast();

  await runTick(); // run one tick immediately, then on the interval

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    void runTick();
  }, config.loop_interval_minutes * 60_000);

  return status;
}

/**
 * Launch a Claude session for an item's suggested action, in the user-chosen
 * directory. The session is seeded with the action prompt plus instructions to
 * write progress back into the item file. Resolves with the session id (read
 * from the first stream-json event) so the UI can show a `claude --resume`
 * command; the process then keeps running in the background.
 */
export async function startActionSession(opts: {
  category: string;
  itemId: string;
  dir: string;
  prompt: string;
}): Promise<{ sessionId: string }> {
  const env = await resolveEnv();
  const itemPath = itemFilePath(opts.category, opts.itemId);
  const prompt = `${opts.prompt}

---
Report progress into the topolome item file at:
  ${itemPath}
Append entries to its "updates" array as { "at": "<ISO 8601 timestamp>", "text": "<what you did or found>" }, preserving everything else in the file. You may also revise or clear its "suggestedAction" ({ "title", "sessionStartPrompt" }) as the work progresses.`;

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      ["-p", prompt, "--permission-mode", "bypassPermissions", "--output-format", "stream-json", "--verbose"],
      { cwd: opts.dir, env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let buffer = "";
    let settled = false;
    proc.stdout?.on("data", (d) => {
      if (settled) return;
      buffer += d.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const ev = JSON.parse(line);
          if (typeof ev.session_id === "string") {
            settled = true;
            resolve({ sessionId: ev.session_id });
            return;
          }
        } catch {
          // not a JSON line yet
        }
      }
    });
    proc.on("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    proc.on("close", (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`session exited (code ${code}) before it started`));
      }
    });
  });
}

/** Stop scheduling. The in-flight job finishes; no further jobs are launched. */
export function stopLoop(): LoopStatus {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  status.enabled = false;
  broadcast();
  return status;
}
