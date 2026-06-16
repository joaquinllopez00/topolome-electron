import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import type { Category as CategoryType } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryProps {
  category: CategoryType
  onRename: (from: string, to: string) => void
  onDelete: (name: string) => void
}

/** A single category row in the sidebar nav, with hover rename/delete actions. */
export function Category({ category, onRename, onDelete }: CategoryProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(category)

  const commit = (): void => {
    const next = value.trim()
    if (next && next !== category) onRename(category, next)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-4 py-1.5">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setValue(category)
              setEditing(false)
            }
          }}
          className="h-6 w-full bg-background px-1 text-sm text-foreground outline-none"
        />
        <button onClick={commit} className="text-muted-foreground hover:text-primary">
          <Check className="size-3.5" />
        </button>
        <button
          onClick={() => {
            setValue(category)
            setEditing(false)
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center">
      <NavLink
        to={`/${encodeURIComponent(category)}`}
        className={({ isActive }) =>
          cn(
            'flex flex-1 items-center gap-2 px-4 py-1.5 text-sm transition-colors',
            isActive
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        {({ isActive }) => (
          <>
            <span className="text-primary">{isActive ? '>' : '·'}</span>
            <span className="truncate">{category}</span>
          </>
        )}
      </NavLink>
      <div className="flex shrink-0 items-center gap-1 pr-3 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          title="Rename"
          className="text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete category "${category}" and all its items?`)) {
              onDelete(category)
            }
          }}
          title="Delete"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
