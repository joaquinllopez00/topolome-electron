export type Category = string

export interface Item {
  title: string
  description: string
  archived: boolean
}

/** An item plus its filesystem id (filename stem), as returned by the store. */
export interface StoredItem extends Item {
  id: string
}

export type LoopPermissionMode = 'acceptEdits' | 'bypassPermissions'

export type Theme = 'light' | 'dark'

export interface Config {
  sources: string[]
  tags: string[]
  system_prompt: string
  item_delimiter: string
  loop_interval_minutes: number
  loop_permission_mode: LoopPermissionMode
  theme: Theme
}

export interface LoopStatus {
  enabled: boolean
  running: boolean
  intervalMinutes: number
  lastRunAt: number | null
  lastExitCode: number | null
  lastError: string | null
}
