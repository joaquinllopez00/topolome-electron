import { app } from "electron";
import { promises as fs, watch } from "fs";
import { join } from "path";

/**
 * Filesystem-backed store. Everything lives under a single data root so the
 * agentic loop (and you) can read/write it directly with plain file tools.
 *
 *   <root>/
 *     config.json            <- sources, system_prompt, theme, loop settings
 *     categories/
 *       <category>/          <- one directory per category (Category = string)
 *         <item>.json        <- one file per item: { title, description, archived }
 */

export const DATA_ROOT = join(app.getPath("home"), ".topolome");
const CATEGORIES_DIR = join(DATA_ROOT, "categories");
const CONFIG_PATH = join(DATA_ROOT, "config.json");
/** Per-category sidecar manifest; reserved filename, never treated as an item. */
const CATEGORY_META_FILE = "category.json";

/** Permission posture for the headless agent passes the loop spawns. */
export type LoopPermissionMode = "acceptEdits" | "bypassPermissions";

export type Theme = "light" | "dark";

/** How items are laid out within a category. */
export type ItemView = "grid" | "list";

/**
 * How a category participates in the loop:
 * - `main`: folded into the shared manifest pass with other `main` categories.
 * - `dedicated`: gets its own scoped pass each tick.
 * - `off`: not pulled by the loop at all.
 */
export type LoopMode = "main" | "dedicated" | "off";

export interface Config {
  sources: string[];
  system_prompt: string;
  /** UI color theme. */
  theme: Theme;
  /** How items are laid out within a category. */
  item_view: ItemView;
  /** Minutes between agent passes when the loop is running. */
  loop_interval_minutes: number;
  /**
   * How much the spawned agent may do without an approval prompt (which it
   * can't answer headlessly). `acceptEdits` = file edits only (MCP/Bash get
   * denied); `bypassPermissions` = full tool access, needed for arbitrary
   * sources like Slack MCP.
   */
  loop_permission_mode: LoopPermissionMode;
}

/**
 * Per-category configuration, stored as `category.json` inside the category
 * directory. `description` disambiguates what belongs here; `sources` scopes
 * which inputs feed it (a subset of — and contributor to — the global catalog).
 */
export interface CategoryMeta {
  description: string;
  sources: string[];
  /** How this category participates in the loop. */
  loopMode: LoopMode;
}

/** Where an item came from. If a link is present the UI can open it. */
export interface Source {
  linkToOpen?: string;
  sourceFriendlyName: string;
}

/** An actionable next step the agent suggests for an item. */
export interface SuggestedAction {
  title: string;
  sessionStartPrompt: string;
}

/** Progress note written back by an action session, directly into the item file. */
export interface ItemUpdate {
  at: string;
  text: string;
}

export interface Item {
  title: string;
  description: string;
  archived: boolean;
  source?: Source;
  suggestedAction?: SuggestedAction;
  updates?: ItemUpdate[];
}

/** An item as exposed to the renderer: file contents plus its filename stem. */
export interface StoredItem extends Item {
  id: string;
}

const DEFAULT_CONFIG: Config = {
  sources: [],
  system_prompt:
    "You categorize incoming items. Read the configured sources, then write each item as a JSON file into the most appropriate category directory.",
  loop_interval_minutes: 10,
  loop_permission_mode: "bypassPermissions",
  theme: "dark",
  item_view: "grid",
};

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/** Create the data root, config, and a couple of seed categories on first run. */
export async function ensureStore(): Promise<void> {
  await fs.mkdir(CATEGORIES_DIR, { recursive: true });

  if (!(await exists(CONFIG_PATH))) {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
  }

  // Seed an example category + item so the UI has something to render.
  const seedDir = join(CATEGORIES_DIR, "inbox");
  if (!(await exists(seedDir))) {
    await fs.mkdir(seedDir, { recursive: true });
    const seedItem: Item = {
      title: "Welcome to topolome",
      description:
        "Categories are directories under ~/.topolome/categories. Items are JSON files inside them. The agent will fill these in.",
      archived: false,
    };
    await fs.writeFile(join(seedDir, "welcome.json"), JSON.stringify(seedItem, null, 2), "utf-8");
  }
}

export async function getConfig(): Promise<Config> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Merge a patch into config.json and return the saved result. */
export async function saveConfig(patch: Partial<Config>): Promise<Config> {
  const current = await getConfig();
  const next: Config = {
    sources: patch.sources ?? current.sources,
    system_prompt: patch.system_prompt ?? current.system_prompt,
    loop_interval_minutes: patch.loop_interval_minutes ?? current.loop_interval_minutes,
    loop_permission_mode: patch.loop_permission_mode ?? current.loop_permission_mode,
    theme: patch.theme ?? current.theme,
    item_view: patch.item_view ?? current.item_view,
  };
  await fs.mkdir(DATA_ROOT, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

/**
 * Watch the categories tree (recursively) and invoke `onChange` whenever the
 * agent — or anything else — adds/edits/removes a category or item file.
 * Returns an unsubscribe function. Recursive watching is supported on macOS
 * and Windows; if it's unavailable the app simply won't get live updates.
 */
export function watchCategories(onChange: () => void): () => void {
  try {
    const watcher = watch(CATEGORIES_DIR, { recursive: true }, () => onChange());
    return () => watcher.close();
  } catch {
    return () => {};
  }
}

export async function listCategories(): Promise<string[]> {
  const entries = await fs.readdir(CATEGORIES_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export async function createCategory(name: string): Promise<string> {
  const safe = name.trim().replace(/[/\\]/g, "-");
  if (!safe) throw new Error("Category name is empty");
  await fs.mkdir(join(CATEGORIES_DIR, safe), { recursive: true });
  return safe;
}

/** Read a category's sidecar manifest, defaulting to empty when absent. */
export async function getCategoryMeta(category: string): Promise<CategoryMeta> {
  try {
    const raw = await fs.readFile(join(CATEGORIES_DIR, category, CATEGORY_META_FILE), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      description: typeof parsed.description === "string" ? parsed.description : "",
      sources: Array.isArray(parsed.sources)
        ? parsed.sources.filter((s: unknown): s is string => typeof s === "string")
        : [],
      loopMode:
        parsed.loopMode === "dedicated" || parsed.loopMode === "off" ? parsed.loopMode : "main",
    };
  } catch {
    return { description: "", sources: [], loopMode: "main" };
  }
}

/**
 * Write a category's sidecar manifest. Any source named here is also merged
 * into the global catalog (config.sources) so free-text entries become
 * selectable from every other category.
 */
export async function setCategoryMeta(category: string, meta: CategoryMeta): Promise<CategoryMeta> {
  const dir = join(CATEGORIES_DIR, category);
  await fs.mkdir(dir, { recursive: true });
  const next: CategoryMeta = {
    description: meta.description.trim(),
    sources: Array.from(new Set(meta.sources.map((s) => s.trim()).filter(Boolean))),
    loopMode: meta.loopMode,
  };
  await fs.writeFile(join(dir, CATEGORY_META_FILE), JSON.stringify(next, null, 2), "utf-8");

  const config = await getConfig();
  const merged = Array.from(new Set([...config.sources, ...next.sources]));
  if (merged.length !== config.sources.length) {
    await saveConfig({ sources: merged });
  }
  return next;
}

/** Validate/normalize an item's `source` field read from disk. */
function parseSource(raw: unknown): Source | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const name = obj.sourceFriendlyName;
  if (typeof name !== "string" || !name.trim()) return undefined;
  const link = obj.linkToOpen;
  return {
    sourceFriendlyName: name,
    ...(typeof link === "string" && link.trim() ? { linkToOpen: link } : {}),
  };
}

function parseSuggestedAction(raw: unknown): SuggestedAction | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string" || !obj.title.trim()) return undefined;
  if (typeof obj.sessionStartPrompt !== "string" || !obj.sessionStartPrompt.trim()) return undefined;
  return { title: obj.title, sessionStartPrompt: obj.sessionStartPrompt };
}

function parseUpdates(raw: unknown): ItemUpdate[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const updates = raw
    .filter((u): u is Record<string, unknown> => !!u && typeof u === "object")
    .map((u) => ({ at: String(u.at ?? ""), text: String(u.text ?? "") }))
    .filter((u) => u.text);
  return updates.length ? updates : undefined;
}

/** Absolute path to an item's JSON file. */
export function itemFilePath(category: string, id: string): string {
  return join(CATEGORIES_DIR, category, `${id}.json`);
}

export async function listItems(category: string): Promise<StoredItem[]> {
  const dir = join(CATEGORIES_DIR, category);
  if (!(await exists(dir))) return [];
  const files = (await fs.readdir(dir)).filter(
    (f) => f.endsWith(".json") && f !== CATEGORY_META_FILE,
  );
  const items = await Promise.all(
    files.map(async (f) => {
      try {
        const raw = await fs.readFile(join(dir, f), "utf-8");
        const parsed = JSON.parse(raw);
        return {
          id: f.replace(/\.json$/, ""),
          title: String(parsed.title ?? f.replace(/\.json$/, "")),
          description: String(parsed.description ?? ""),
          archived: Boolean(parsed.archived ?? false),
          source: parseSource(parsed.source),
          suggestedAction: parseSuggestedAction(parsed.suggestedAction),
          updates: parseUpdates(parsed.updates),
        } as StoredItem;
      } catch {
        return null;
      }
    }),
  );
  return items
    .filter((i): i is StoredItem => i !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

async function uniqueId(dir: string, base: string): Promise<string> {
  let id = base;
  let n = 2;
  while (await exists(join(dir, `${id}.json`))) {
    id = `${base}-${n++}`;
  }
  return id;
}

async function writeItem(dir: string, id: string, item: Item): Promise<void> {
  const payload: Item = {
    title: item.title,
    description: item.description,
    archived: item.archived,
    // Preserve agent-provided fields through edits/archives.
    ...(item.source ? { source: item.source } : {}),
    ...(item.suggestedAction ? { suggestedAction: item.suggestedAction } : {}),
    ...(item.updates?.length ? { updates: item.updates } : {}),
  };
  await fs.writeFile(join(dir, `${id}.json`), JSON.stringify(payload, null, 2), "utf-8");
}

export async function createItem(
  category: string,
  data: { title: string; description: string },
): Promise<StoredItem> {
  const dir = join(CATEGORIES_DIR, category);
  await fs.mkdir(dir, { recursive: true });
  const id = await uniqueId(dir, slugify(data.title));
  const item: Item = {
    title: data.title.trim() || id,
    description: data.description.trim(),
    archived: false,
  };
  await writeItem(dir, id, item);
  return { id, ...item };
}

export async function updateItem(
  category: string,
  id: string,
  patch: Partial<Item>,
): Promise<StoredItem> {
  const dir = join(CATEGORIES_DIR, category);
  const path = join(dir, `${id}.json`);
  let current: Item = { title: id, description: "", archived: false };
  try {
    current = { ...current, ...JSON.parse(await fs.readFile(path, "utf-8")) };
  } catch {
    // fall back to defaults if the file is missing/corrupt
  }
  const next: Item = { ...current, ...patch };
  await writeItem(dir, id, next);
  return { id, ...next };
}

export async function deleteItem(category: string, id: string): Promise<void> {
  await fs.rm(join(CATEGORIES_DIR, category, `${id}.json`), { force: true });
}

export async function renameCategory(from: string, to: string): Promise<string> {
  const safe = to.trim().replace(/[/\\]/g, "-");
  if (!safe) throw new Error("Category name is empty");
  await fs.rename(join(CATEGORIES_DIR, from), join(CATEGORIES_DIR, safe));
  return safe;
}

export async function deleteCategory(name: string): Promise<void> {
  await fs.rm(join(CATEGORIES_DIR, name), { recursive: true, force: true });
}
