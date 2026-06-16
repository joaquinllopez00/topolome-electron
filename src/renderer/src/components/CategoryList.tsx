import type { Category as CategoryType } from "@/types";
import { Category as CategoryRow } from "./Category";

interface CategoryListProps {
  categories: CategoryType[];
  onRename: (from: string, to: string) => void;
  onDelete: (name: string) => void;
}

export function CategoryList({
  categories,
  onRename,
  onDelete,
}: CategoryListProps): React.JSX.Element {
  if (categories.length === 0) {
    return <p className="px-4 py-2 text-[11px] text-muted-foreground">no categories yet</p>;
  }

  return (
    <nav className="flex flex-col">
      {categories.map((category) => (
        <CategoryRow key={category} category={category} onRename={onRename} onDelete={onDelete} />
      ))}
    </nav>
  );
}
