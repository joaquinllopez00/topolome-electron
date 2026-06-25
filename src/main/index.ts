import { app, shell, BrowserWindow, ipcMain, nativeImage, nativeTheme, dialog } from "electron";
import { existsSync } from "fs";
import { join } from "path";
import {
  ensureStore,
  getConfig,
  saveConfig,
  listCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  getCategoryMeta,
  setCategoryMeta,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  watchCategories,
  DATA_ROOT,
  type Item,
  type Config,
  type CategoryMeta,
} from "./store";
import {
  startLoop,
  stopLoop,
  getLoopStatus,
  getLoopLogs,
  startActionSession,
  sendToSession,
} from "./loop";

function resolveIconPath(): string | undefined {
  const candidates = [
    join(process.cwd(), "resources/icon.png"),
    join(__dirname, "../../resources/icon.png"),
  ];
  return candidates.find((path) => existsSync(path));
}

function loadAppIcon(): Electron.NativeImage | undefined {
  const iconPath = resolveIconPath();
  if (!iconPath) return undefined;
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? undefined : icon;
}

function applyAppIcon(): void {
  const icon = loadAppIcon();
  if (!icon || process.platform !== "darwin" || !app.dock) return;
  app.dock.setIcon(icon);
}

function createWindow(): void {
  const icon = loadAppIcon();
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    backgroundColor: "#0a0a0a",
    titleBarStyle: "hiddenInset",
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // electron-vite injects this env var in dev to point at the vite dev server.
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  applyAppIcon();
  await ensureStore();

  // Keep the native window chrome (traffic lights, scrollbars) in sync with
  // the configured UI theme.
  nativeTheme.themeSource = (await getConfig()).theme;

  ipcMain.handle("config:get", () => getConfig());
  ipcMain.handle("config:set", async (_e, patch: Partial<Config>) => {
    const saved = await saveConfig(patch);
    nativeTheme.themeSource = saved.theme;
    return saved;
  });
  ipcMain.handle("store:root", () => DATA_ROOT);
  ipcMain.handle("shell:openExternal", (_e, url: string) => {
    if (typeof url === "string" && url.trim()) return shell.openExternal(url);
    return undefined;
  });
  ipcMain.handle("categories:list", () => listCategories());
  ipcMain.handle("categories:create", (_e, name: string) => createCategory(name));
  ipcMain.handle("categories:rename", (_e, from: string, to: string) => renameCategory(from, to));
  ipcMain.handle("categories:delete", (_e, name: string) => deleteCategory(name));
  ipcMain.handle("categories:getMeta", (_e, category: string) => getCategoryMeta(category));
  ipcMain.handle("categories:setMeta", (_e, category: string, meta: CategoryMeta) =>
    setCategoryMeta(category, meta),
  );

  ipcMain.handle("items:list", (_e, category: string) => listItems(category));
  ipcMain.handle(
    "items:create",
    (_e, category: string, data: { title: string; description: string }) =>
      createItem(category, data),
  );
  ipcMain.handle("items:update", (_e, category: string, id: string, patch: Partial<Item>) =>
    updateItem(category, id, patch),
  );
  ipcMain.handle("items:delete", (_e, category: string, id: string) => deleteItem(category, id));

  ipcMain.handle("dialog:pickDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
  ipcMain.handle(
    "session:start",
    (_e, opts: { category: string; itemId: string; dir: string; prompt: string }) =>
      startActionSession(opts),
  );
  ipcMain.handle(
    "session:send",
    (_e, opts: { category: string; itemId: string; message: string }) => sendToSession(opts),
  );

  ipcMain.handle("loop:start", () => startLoop());
  ipcMain.handle("loop:stop", () => stopLoop());
  ipcMain.handle("loop:status", () => getLoopStatus());
  ipcMain.handle("loop:logs", () => getLoopLogs());

  createWindow();

  // Live updates: when the agent writes into the categories tree, tell the
  // renderer to re-fetch. Debounced so a burst of writes in one pass coalesces
  // into a single refresh.
  let changeTimer: ReturnType<typeof setTimeout> | null = null;
  const stopWatch = watchCategories(() => {
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send("store:changed");
      }
    }, 200);
  });
  app.on("will-quit", () => stopWatch());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
