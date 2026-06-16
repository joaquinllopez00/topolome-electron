import { useState } from 'react'
import { Archive, ArchiveRestore, Pencil, Trash2, Check, X } from 'lucide-react'
import type { StoredItem } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

interface CategoryItemProps {
  item: StoredItem
  onToggleArchive: (item: StoredItem) => void
  onDelete: (item: StoredItem) => void
  onSave: (item: StoredItem, patch: { title: string; description: string }) => void
}

/** A single item card within a category. Supports inline edit, archive, delete. */
export function CategoryItem({
  item,
  onToggleArchive,
  onDelete,
  onSave
}: CategoryItemProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)

  const save = (): void => {
    if (!title.trim()) return
    onSave(item, { title: title.trim(), description: description.trim() })
    setEditing(false)
  }

  const cancel = (): void => {
    setTitle(item.title)
    setDescription(item.description)
    setEditing(false)
  }

  if (editing) {
    return (
      <Card className="gap-2 rounded-none border-primary/50 p-4">
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="description"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <Button size="icon-sm" variant="ghost" onClick={cancel} title="Cancel">
            <X />
          </Button>
          <Button size="icon-sm" onClick={save} title="Save">
            <Check />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'group relative gap-2 rounded-none p-4 transition-colors hover:border-primary/50',
        item.archived && 'opacity-40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground">{item.title}</h3>
        {item.archived && (
          <span className="shrink-0 text-[10px] tracking-wider text-muted-foreground uppercase">
            archived
          </span>
        )}
      </div>
      {item.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      )}

      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => onToggleArchive(item)}
          title={item.archived ? 'Unarchive' : 'Archive'}
        >
          {item.archived ? <ArchiveRestore /> : <Archive />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setEditing(true)}
          title="Edit"
        >
          <Pencil />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => onDelete(item)}
          title="Delete"
          className="hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>
    </Card>
  )
}
