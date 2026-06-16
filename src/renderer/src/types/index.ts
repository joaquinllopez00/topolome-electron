export type Category = string;

/** Where an item came from. If a link is present the UI can open it. */
export interface Source {
  linkToOpen?: string;
  sourceFriendlyName: string;
}

export interface Item {
  title: string;
  description: string;
  archived: boolean;
  source?: Source;
}

/** An item plus its filesystem id (filename stem), as returned by the store. */
export interface StoredItem extends Item {
  id: string;
}

export type LoopPermissionMode = "acceptEdits" | "bypassPermissions";

export type Theme = "light" | "dark";

export type ItemView = "grid" | "list";

export interface Config {
  sources: string[];
  system_prompt: string;
  loop_interval_minutes: number;
  loop_permission_mode: LoopPermissionMode;
  theme: Theme;
  item_view: ItemView;
}

export interface LoopStatus {
  enabled: boolean;
  running: boolean;
  intervalMinutes: number;
  lastRunAt: number | null;
  lastExitCode: number | null;
  lastError: string | null;
}
