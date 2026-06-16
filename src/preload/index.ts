import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch: {
    sources?: string[]
    tags?: string[]
    system_prompt?: string
    item_delimiter?: string
  }) => ipcRenderer.invoke('config:set', patch),
  getStoreRoot: () => ipcRenderer.invoke('store:root'),
  listCategories: () => ipcRenderer.invoke('categories:list'),
  createCategory: (name: string) => ipcRenderer.invoke('categories:create', name),
  renameCategory: (from: string, to: string) =>
    ipcRenderer.invoke('categories:rename', from, to),
  deleteCategory: (name: string) => ipcRenderer.invoke('categories:delete', name),
  listItems: (category: string) => ipcRenderer.invoke('items:list', category),
  createItem: (category: string, data: { title: string; description: string }) =>
    ipcRenderer.invoke('items:create', category, data),
  updateItem: (
    category: string,
    id: string,
    patch: { title?: string; description?: string; archived?: boolean }
  ) => ipcRenderer.invoke('items:update', category, id, patch),
  deleteItem: (category: string, id: string) =>
    ipcRenderer.invoke('items:delete', category, id)
}

contextBridge.exposeInMainWorld('topolome', api)

export type TopolomeApi = typeof api
