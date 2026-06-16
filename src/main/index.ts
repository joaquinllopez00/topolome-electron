import { app, shell, BrowserWindow, ipcMain } from 'electron'
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

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    show: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
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
  await ensureStore()

  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:set', (_e, patch: Partial<Config>) => saveConfig(patch))
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

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
