import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Pencil, Trash2, Check, X } from "lucide-react";
import type { Category as CategoryType } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface CategoryProps {
  category: CategoryType;
  onRename: (from: string, to: string) => void;
  onDelete: (name: string) => void;
}

/** A single category row in the sidebar nav, with hover rename/delete actions. */
export function Category({ category, onRename, onDelete }: CategoryProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(category);

  const commit = (): void => {
    const next = value.trim();
    if (next && next !== category) onRename(category, next);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="relative px-4 py-1.5">
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue(category);
              setEditing(false);
            }
          }}
          className="h-6 pr-16 text-sm"
        />

        <div className="absolute inset-y-0 right-2 flex items-center">
          <div className="flex items-center border border-border bg-card shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Save"
              className="rounded-none"
              onClick={commit}
            >
              <Check />
              <span className="sr-only">Save</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Cancel"
              className="rounded-none border-l border-border"
              onClick={() => {
                setValue(category);
                setEditing(false);
              }}
            >
              <X />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <NavLink
        to={`/${encodeURIComponent(category)}`}
        className={({ isActive }) =>
          cn(
            "flex w-full items-center gap-2 px-4 py-1.5 text-sm transition-colors duration-150 hover:transition-none",
            isActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground",
          )
        }
      >
        {({ isActive }) => (
          <>
            <span className="text-primary">{isActive ? ">" : "·"}</span>
            <span className="truncate pr-16">{category}</span>
          </>
        )}
      </NavLink>

      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:transition-none">
        <div className="flex items-center border border-border bg-card shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Rename"
            className="rounded-none"
            onClick={() => setEditing(true)}
          >
            <Pencil />
            <span className="sr-only">Rename</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Delete"
            className="rounded-none border-l border-border hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete category "${category}" and all its items?`)) {
                onDelete(category);
              }
            }}
          >
            <Trash2 />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
