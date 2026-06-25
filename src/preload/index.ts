import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

interface LoopStatus {
  enabled: boolean;
  running: boolean;
  intervalMinutes: number;
  activePass: string | null;
  passIndex: number | null;
  passTotal: number | null;
  lastRunAt: number | null;
  lastExitCode: number | null;
  lastError: string | null;
}

const api = {
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (patch: {
    sources?: string[];
    system_prompt?: string;
    theme?: "light" | "dark";
    item_view?: "grid" | "list";
    loop_interval_minutes?: number;
    loop_permission_mode?: "acceptEdits" | "bypassPermissions";
  }) => ipcRenderer.invoke("config:set", patch),
  getStoreRoot: () => ipcRenderer.invoke("store:root"),
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  pickDirectory: () => ipcRenderer.invoke("dialog:pickDirectory"),
  startSession: (opts: { category: string; itemId: string; dir: string; prompt: string }) =>
    ipcRenderer.invoke("session:start", opts),
  sendToSession: (opts: { category: string; itemId: string; message: string }) =>
    ipcRenderer.invoke("session:send", opts),
  /** Subscribe to filesystem changes in the categories tree. Returns unsubscribe. */
  onStoreChanged: (cb: () => void) => {
    const listener = (): void => cb();
    ipcRenderer.on("store:changed", listener);
    return () => ipcRenderer.removeListener("store:changed", listener);
  },
  listCategories: () => ipcRenderer.invoke("categories:list"),
  createCategory: (name: string) => ipcRenderer.invoke("categories:create", name),
  renameCategory: (from: string, to: string) => ipcRenderer.invoke("categories:rename", from, to),
  deleteCategory: (name: string) => ipcRenderer.invoke("categories:delete", name),
  getCategoryMeta: (category: string) => ipcRenderer.invoke("categories:getMeta", category),
  setCategoryMeta: (category: string, meta: { description: string; sources: string[] }) =>
    ipcRenderer.invoke("categories:setMeta", category, meta),
  listItems: (category: string) => ipcRenderer.invoke("items:list", category),
  createItem: (category: string, data: { title: string; description: string }) =>
    ipcRenderer.invoke("items:create", category, data),
  updateItem: (
    category: string,
    id: string,
    patch: { title?: string; description?: string; archived?: boolean },
  ) => ipcRenderer.invoke("items:update", category, id, patch),
  deleteItem: (category: string, id: string) => ipcRenderer.invoke("items:delete", category, id),
  startLoop: () => ipcRenderer.invoke("loop:start"),
  stopLoop: () => ipcRenderer.invoke("loop:stop"),
  getLoopStatus: () => ipcRenderer.invoke("loop:status"),
  /** Subscribe to push updates from the main-process loop. Returns an unsubscribe fn. */
  onLoopStatus: (cb: (status: LoopStatus) => void) => {
    const listener = (_e: IpcRendererEvent, status: LoopStatus): void => cb(status);
    ipcRenderer.on("loop:status", listener);
    return () => ipcRenderer.removeListener("loop:status", listener);
  },
  /** Full buffered log of the loop's output so far. */
  getLoopLogs: () => ipcRenderer.invoke("loop:logs"),
  /** Subscribe to live output chunks from the loop. Returns an unsubscribe fn. */
  onLoopOutput: (cb: (chunk: string) => void) => {
    const listener = (_e: IpcRendererEvent, chunk: string): void => cb(chunk);
    ipcRenderer.on("loop:output", listener);
    return () => ipcRenderer.removeListener("loop:output", listener);
  },
};

contextBridge.exposeInMainWorld("topolome", api);

export type TopolomeApi = typeof api;
