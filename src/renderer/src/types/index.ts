export type Category = string

/** How a category participates in the loop. */
export type LoopMode = 'main' | 'dedicated' | 'off'

/** Per-category configuration stored as a `category.json` sidecar. */
export interface CategoryMeta {
  description: string
  sources: string[]
  loopMode: LoopMode
};

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

/** A timeline entry on an item: the user's prompt or the agent's progress note. */
export interface ItemUpdate {
  at: string;
  text: string;
  role?: "user" | "agent";
}

/** The Claude session started for an item, reused for all follow-ups. */
export interface ActionSession {
  id: string;
  dir: string;
}

export interface Item {
  title: string;
  description: string;
  archived: boolean;
  sources?: Source[];
  suggestedAction?: SuggestedAction;
  updates?: ItemUpdate[];
  actionSession?: ActionSession;
}

/** An item plus its filesystem id and timestamps, as returned by the store. */
export interface StoredItem extends Item {
  id: string;
  createdAt: number;
  modifiedAt: number;
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
  /** Label of the job currently running (e.g. "Main loop" or a category name). */
  activePass: string | null;
  /** 1-based index and total of jobs in the current tick. */
  passIndex: number | null;
  passTotal: number | null;
  lastRunAt: number | null;
  lastExitCode: number | null;
  lastError: string | null;
}
