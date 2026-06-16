import type { StoredItem } from '@/types'
import { CategoryItem } from './CategoryItem'

interface CategoryItemListProps {
  items: StoredItem[]
  onToggleArchive: (item: StoredItem) => void
  onDelete: (item: StoredItem) => void
  onSave: (item: StoredItem, patch: { title: string; description: string }) => void
}

export function CategoryItemList({
  items,
  onToggleArchive,
  onDelete,
  onSave
}: CategoryItemListProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        no items here yet — the agent hasn&apos;t filed anything into this category.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <CategoryItem
          key={item.id}
          item={item}
          onToggleArchive={onToggleArchive}
          onDelete={onDelete}
          onSave={onSave}
        />
      ))}
    </div>
  )
}
