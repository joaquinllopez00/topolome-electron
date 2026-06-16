import { app, shell, BrowserWindow, ipcMain, nativeImage, nativeTheme } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  ensureStore,
  getConfig,
  saveConfig,
  listCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  DATA_ROOT,
  type Item,
  type Config
} from './store'
import { startLoop, stopLoop, getLoopStatus, getLoopLogs } from './loop'

function resolveIconPath(): string | undefined {
  const candidates = [
    join(process.cwd(), 'resources/icon.png'),
    join(__dirname, '../../resources/icon.png')
  ]
  return candidates.find((path) => existsSync(path))
}

function loadAppIcon(): Electron.NativeImage | undefined {
  const iconPath = resolveIconPath()
  if (!iconPath) return undefined
  const icon = nativeImage.createFromPath(iconPath)
  return icon.isEmpty() ? undefined : icon
}

function applyAppIcon(): void {
  const icon = loadAppIcon()
  if (!icon || process.platform !== 'darwin' || !app.dock) return
  app.dock.setIcon(icon)
}

function createWindow(): void {
  const icon = loadAppIcon()
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // electron-vite injects this env var in dev to point at the vite dev server.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  applyAppIcon()
  await ensureStore()

  // Keep the native window chrome (traffic lights, scrollbars) in sync with
  // the configured UI theme.
  nativeTheme.themeSource = (await getConfig()).theme

  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:set', async (_e, patch: Partial<Config>) => {
    const saved = await saveConfig(patch)
    nativeTheme.themeSource = saved.theme
    return saved
  })
  ipcMain.handle('store:root', () => DATA_ROOT)
  ipcMain.handle('categories:list', () => listCategories())
  ipcMain.handle('categories:create', (_e, name: string) => createCategory(name))
  ipcMain.handle('categories:rename', (_e, from: string, to: string) =>
    renameCategory(from, to)
  )
  ipcMain.handle('categories:delete', (_e, name: string) => deleteCategory(name))

  ipcMain.handle('items:list', (_e, category: string) => listItems(category))
  ipcMain.handle(
    'items:create',
    (_e, category: string, data: { title: string; description: string }) =>
      createItem(category, data)
  )
  ipcMain.handle(
    'items:update',
    (_e, category: string, id: string, patch: Partial<Item>) =>
      updateItem(category, id, patch)
  )
  ipcMain.handle('items:delete', (_e, category: string, id: string) =>
    deleteItem(category, id)
  )

  ipcMain.handle('loop:start', () => startLoop())
  ipcMain.handle('loop:stop', () => stopLoop())
  ipcMain.handle('loop:status', () => getLoopStatus())
  ipcMain.handle('loop:logs', () => getLoopLogs())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
