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

export interface Config {
  sources: string[]
  tags: string[]
  system_prompt: string
  item_delimiter: string
}
