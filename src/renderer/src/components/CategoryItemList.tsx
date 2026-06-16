import type { ItemView, StoredItem } from "@/types";
import { cn } from "@/lib/utils";
import { CategoryItem } from "./CategoryItem";

interface CategoryItemListProps {
  items: StoredItem[];
  category: string;
  view: ItemView;
  onToggleArchive: (item: StoredItem) => void;
  onDelete: (item: StoredItem) => void;
  onSave: (item: StoredItem, patch: { title: string; description: string }) => void;
}

export function CategoryItemList({
  items,
  category,
  view,
  onToggleArchive,
  onDelete,
  onSave,
}: CategoryItemListProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        no items here yet — the agent hasn&apos;t filed anything into this category.
      </p>
    );
  }

  return (
    <div
      className={cn(
        view === "grid"
          ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          : "flex flex-col gap-2",
      )}
    >
      {items.map((item) => (
        <CategoryItem
          key={item.id}
          item={item}
          category={category}
          onToggleArchive={onToggleArchive}
          onDelete={onDelete}
          onSave={onSave}
        />
      ))}
    </div>
  );
}
