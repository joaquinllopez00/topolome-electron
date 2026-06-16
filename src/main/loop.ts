import { spawn, type ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { DATA_ROOT, getConfig, type Config } from './store'

/**
 * Drives the categorization agent from inside the app.
 *
 * The main process owns the schedule: a setInterval ticks every
 * `loop_interval_minutes` and spawns ONE headless agent pass per tick.
 *
 * Overlap rule: if a pass is still running when the next tick fires, that tick
 * is SKIPPED — we never run two passes at once and we never kill an in-flight
 * one (killing mid-pass could leave half-written JSON in the data dir).
 */

export interface LoopStatus {
  /** The interval scheduler is on. */
  enabled: boolean
  /** A pass is executing right now. */
  running: boolean
  intervalMinutes: number
  lastRunAt: number | null
  lastExitCode: number | null
  lastError: string | null
}

let timer: ReturnType<typeof setInterval> | null = null
let child: ChildProcess | null = null
/** PATH as seen by a login shell — GUI apps don't inherit it (see resolveEnv). */
let cachedPath: string | null = null

/** Rolling combined stdout+stderr log, capped so it can't grow unbounded. */
const MAX_LOG_CHARS = 100_000
let logs = ''

export function getLoopLogs(): string {
  return logs
}

function appendLog(chunk: string): void {
  logs = (logs + chunk).slice(-MAX_LOG_CHARS)
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('loop:output', chunk)
  }
}

const status: LoopStatus = {
  enabled: false,
  running: false,
  intervalMinutes: 10,
  lastRunAt: null,
  lastExitCode: null,
  lastError: null
}

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('loop:status', status)
  }
}

export function getLoopStatus(): LoopStatus {
  return status
}

/**
 * A GUI app launched from Finder/Dock does not inherit the user's shell PATH,
 * so `spawn('claude')` would throw ENOENT. Resolve PATH once via a login shell
 * and reuse it for every pass.
 */
async function resolveEnv(): Promise<NodeJS.ProcessEnv> {
  if (cachedPath === null) {
    cachedPath = await new Promise<string>((resolve) => {
      const shell = process.env.SHELL || '/bin/zsh'
      const probe = spawn(shell, ['-lc', 'echo $PATH'])
      let out = ''
      probe.stdout?.on('data', (d) => (out += d.toString()))
      probe.on('close', () => resolve(out.trim() || process.env.PATH || ''))
      probe.on('error', () => resolve(process.env.PATH || ''))
    })
  }
  return { ...process.env, PATH: cachedPath }
}

/** Single-pass operating instructions, built from the live config. */
function buildPassPrompt(config: Config): string {
  const sources = config.sources.length
    ? config.sources.join(', ')
    : 'see config.json'
  const tags = config.tags.length
    ? config.tags.join(', ')
    : '(none defined — create categories as needed)'
  const operator =
    config.system_prompt.trim() || '(define this in config.json → system_prompt)'

  return `Act as topolome's categorization agent. Run exactly ONE pass, then stop.

OPERATOR INSTRUCTIONS (what to collect, from config.json → system_prompt):
${operator}

THIS PASS:
1. Read ${DATA_ROOT}/config.json for the live sources, tags, system_prompt, and item_delimiter.
2. Check every source: ${sources}
   Split multi-item content on the configured item_delimiter.
3. For each candidate, decide if it belongs per the operator instructions. Skip anything that doesn't.
4. Pick the single best category. Allowed tags: ${tags}.
   Categories are directories under ${DATA_ROOT}/categories/. Reuse an existing one when it fits; otherwise create the directory.
5. Write each new item as its own file:
     ${DATA_ROOT}/categories/<category>/<slug>.json
   with EXACTLY this shape: { "title": string, "description": string, "archived": false }
   Use a filesystem-safe slug of the title for <slug>.
6. Dedupe: before writing, read the existing files in the target category and skip items already present.
7. Never delete, overwrite, or unarchive items you didn't create this pass.`
}

/**
 * Turn one `stream-json` event line into a human-readable log line. Returns ''
 * for events we don't surface, and falls back to the raw line if it isn't JSON.
 */
function formatEvent(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) return ''
  let event: {
    type?: string
    subtype?: string
    result?: string
    total_cost_usd?: number
    message?: { content?: Array<{ type?: string; text?: string; name?: string }> }
  }
  try {
    event = JSON.parse(trimmed)
  } catch {
    return trimmed // not JSON — show it raw
  }

  switch (event.type) {
    case 'system':
      return event.subtype === 'init' ? '▸ session started' : ''
    case 'assistant': {
      const parts: string[] = []
      for (const block of event.message?.content ?? []) {
        if (block.type === 'text' && block.text?.trim()) {
          parts.push(block.text.trim())
        } else if (block.type === 'tool_use') {
          parts.push(`→ ${block.name}`)
        }
      }
      return parts.join('\n')
    }
    case 'result': {
      const cost =
        typeof event.total_cost_usd === 'number'
          ? ` ($${event.total_cost_usd.toFixed(4)})`
          : ''
      return `✓ ${event.subtype ?? 'done'}${cost}`
    }
    default:
      return ''
  }
}

async function runPass(): Promise<void> {
  // Overlap guard: a pass is still running, so skip this tick.
  if (child) return

  const config = await getConfig()
  const env = await resolveEnv()
  const prompt = buildPassPrompt(config)
  // Fall back to the safe mode if config.json was hand-edited to junk.
  const permissionMode =
    config.loop_permission_mode === 'bypassPermissions'
      ? 'bypassPermissions'
      : 'acceptEdits'

  // Headless print mode, scoped to edits in the data dir — no interactive
  // approval is possible from a spawned process. Prompt passed as a clean argv
  // element so there's no shell-escaping to get wrong.
  // stream-json + verbose emits one JSON event per line as the agent works,
  // so we can show live progress instead of one dump at the end.
  //
  // Permission posture comes from config (loop_permission_mode). An autonomous
  // pass can't answer interactive approval prompts: under acceptEdits anything
  // beyond file edits (Bash, MCP source reads like Slack) is auto-DENIED;
  // bypassPermissions grants full tool access for arbitrary sources.
  //
  // stdin is ignored so `claude -p` doesn't stall 3s waiting on it.
  child = spawn(
    'claude',
    [
      '-p',
      prompt,
      '--permission-mode',
      permissionMode,
      '--output-format',
      'stream-json',
      '--verbose'
    ],
    { cwd: DATA_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] }
  )

  status.running = true
  status.lastError = null
  broadcast()
  appendLog(`\n── pass started ${new Date().toLocaleTimeString()} ──\n`)

  let stderr = ''
  // stdout arrives in arbitrary chunks; buffer until we have whole lines.
  let stdoutBuffer = ''
  child.stdout?.on('data', (d) => {
    stdoutBuffer += d.toString()
    const lines = stdoutBuffer.split('\n')
    stdoutBuffer = lines.pop() ?? ''
    for (const line of lines) {
      const formatted = formatEvent(line)
      if (formatted) appendLog(formatted + '\n')
    }
  })
  child.stderr?.on('data', (d) => {
    const s = d.toString()
    stderr += s
    appendLog(s)
  })

  child.on('error', (err) => {
    status.lastError = err.message
    appendLog(`\n[error] ${err.message}\n`)
  })

  child.on('close', (code) => {
    child = null
    status.running = false
    status.lastRunAt = Date.now()
    status.lastExitCode = code
    if (code !== 0) {
      status.lastError =
        stderr.trim().slice(-500) || `agent exited with code ${code}`
    }
    appendLog(`\n── pass finished (exit ${code}) ──\n`)
    broadcast()
  })
}

export async function startLoop(): Promise<LoopStatus> {
  const config = await getConfig()
  status.enabled = true
  status.intervalMinutes = config.loop_interval_minutes
  broadcast()

  await runPass() // run one immediately, then on the interval

  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    void runPass()
  }, config.loop_interval_minutes * 60_000)

  return status
}

/** Stop scheduling. An in-flight pass is left to finish on its own. */
export function stopLoop(): LoopStatus {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  status.enabled = false
  broadcast()
  return status
}
