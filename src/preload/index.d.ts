import type { Config, Item, StoredItem } from '@/types'

declare global {
  interface Window {
    topolome: {
      getConfig: () => Promise<Config>
      setConfig: (patch: Partial<Config>) => Promise<Config>
      getStoreRoot: () => Promise<string>
      listCategories: () => Promise<string[]>
      createCategory: (name: string) => Promise<void>
      renameCategory: (from: string, to: string) => Promise<string>
      deleteCategory: (name: string) => Promise<void>
      listItems: (category: string) => Promise<StoredItem[]>
      createItem: (
        category: string,
        data: { title: string; description: string }
      ) => Promise<StoredItem>
      updateItem: (
        category: string,
        id: string,
        patch: Partial<Item>
      ) => Promise<StoredItem>
      deleteItem: (category: string, id: string) => Promise<void>
    }
  }
}

export {}
