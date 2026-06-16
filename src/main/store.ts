import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * Filesystem-backed store. Everything lives under a single data root so the
 * agentic loop (and you) can read/write it directly with plain file tools.
 *
 *   <root>/
 *     config.json            <- sources, tags, system_prompt, item_delimiter
 *     categories/
 *       <category>/          <- one directory per category (Category = string)
 *         <item>.json        <- one file per item: { title, description, archived }
 */

export const DATA_ROOT = join(app.getPath('home'), '.topolome')
const CATEGORIES_DIR = join(DATA_ROOT, 'categories')
const CONFIG_PATH = join(DATA_ROOT, 'config.json')

export interface Config {
  sources: string[]
  tags: string[]
  system_prompt: string
  item_delimiter: string
}

export interface Item {
  title: string
  description: string
  archived: boolean
}

/** An item as exposed to the renderer: file contents plus its filename stem. */
export interface StoredItem extends Item {
  id: string
}

const DEFAULT_CONFIG: Config = {
  sources: [],
  tags: [],
  system_prompt:
    'You categorize incoming items. Read the configured sources, then write each item as a JSON file into the most appropriate category directory.',
  item_delimiter: '\n---\n'
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

/** Create the data root, config, and a couple of seed categories on first run. */
export async function ensureStore(): Promise<void> {
  await fs.mkdir(CATEGORIES_DIR, { recursive: true })

  if (!(await exists(CONFIG_PATH))) {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8')
  }

  // Seed an example category + item so the UI has something to render.
  const seedDir = join(CATEGORIES_DIR, 'inbox')
  if (!(await exists(seedDir))) {
    await fs.mkdir(seedDir, { recursive: true })
    const seedItem: Item = {
      title: 'Welcome to topolome',
      description:
        'Categories are directories under ~/.topolome/categories. Items are JSON files inside them. The agent will fill these in.',
      archived: false
    }
    await fs.writeFile(
      join(seedDir, 'welcome.json'),
      JSON.stringify(seedItem, null, 2),
      'utf-8'
    )
  }
}

export async function getConfig(): Promise<Config> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

/** Merge a patch into config.json and return the saved result. */
export async function saveConfig(patch: Partial<Config>): Promise<Config> {
  const current = await getConfig()
  const next: Config = {
    sources: patch.sources ?? current.sources,
    tags: patch.tags ?? current.tags,
    system_prompt: patch.system_prompt ?? current.system_prompt,
    item_delimiter: patch.item_delimiter ?? current.item_delimiter
  }
  await fs.mkdir(DATA_ROOT, { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export async function listCategories(): Promise<string[]> {
  const entries = await fs.readdir(CATEGORIES_DIR, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

export async function createCategory(name: string): Promise<void> {
  const safe = name.trim().replace(/[/\\]/g, '-')
  if (!safe) throw new Error('Category name is empty')
  await fs.mkdir(join(CATEGORIES_DIR, safe), { recursive: true })
}

export async function listItems(category: string): Promise<StoredItem[]> {
  const dir = join(CATEGORIES_DIR, category)
  if (!(await exists(dir))) return []
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'))
  const items = await Promise.all(
    files.map(async (f) => {
      try {
        const raw = await fs.readFile(join(dir, f), 'utf-8')
        const parsed = JSON.parse(raw)
        return {
          id: f.replace(/\.json$/, ''),
          title: String(parsed.title ?? f.replace(/\.json$/, '')),
          description: String(parsed.description ?? ''),
          archived: Boolean(parsed.archived ?? false)
        } as StoredItem
      } catch {
        return null
      }
    })
  )
  return items
    .filter((i): i is StoredItem => i !== null)
    .sort((a, b) => a.title.localeCompare(b.title))
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item'
  )
}

async function uniqueId(dir: string, base: string): Promise<string> {
  let id = base
  let n = 2
  while (await exists(join(dir, `${id}.json`))) {
    id = `${base}-${n++}`
  }
  return id
}

async function writeItem(dir: string, id: string, item: Item): Promise<void> {
  const payload: Item = {
    title: item.title,
    description: item.description,
    archived: item.archived
  }
  await fs.writeFile(join(dir, `${id}.json`), JSON.stringify(payload, null, 2), 'utf-8')
}

export async function createItem(
  category: string,
  data: { title: string; description: string }
): Promise<StoredItem> {
  const dir = join(CATEGORIES_DIR, category)
  await fs.mkdir(dir, { recursive: true })
  const id = await uniqueId(dir, slugify(data.title))
  const item: Item = {
    title: data.title.trim() || id,
    description: data.description.trim(),
    archived: false
  }
  await writeItem(dir, id, item)
  return { id, ...item }
}

export async function updateItem(
  category: string,
  id: string,
  patch: Partial<Item>
): Promise<StoredItem> {
  const dir = join(CATEGORIES_DIR, category)
  const path = join(dir, `${id}.json`)
  let current: Item = { title: id, description: '', archived: false }
  try {
    current = { ...current, ...JSON.parse(await fs.readFile(path, 'utf-8')) }
  } catch {
    // fall back to defaults if the file is missing/corrupt
  }
  const next: Item = { ...current, ...patch }
  await writeItem(dir, id, next)
  return { id, ...next }
}

export async function deleteItem(category: string, id: string): Promise<void> {
  await fs.rm(join(CATEGORIES_DIR, category, `${id}.json`), { force: true })
}

export async function renameCategory(from: string, to: string): Promise<string> {
  const safe = to.trim().replace(/[/\\]/g, '-')
  if (!safe) throw new Error('Category name is empty')
  await fs.rename(join(CATEGORIES_DIR, from), join(CATEGORIES_DIR, safe))
  return safe
}

export async function deleteCategory(name: string): Promise<void> {
  await fs.rm(join(CATEGORIES_DIR, name), { recursive: true, force: true })
}
