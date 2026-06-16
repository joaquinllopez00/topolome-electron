import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { StoredItem } from '@/types'
import { CategoryItemList } from '../components/CategoryItemList'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'

export default function CategoryRoute(): React.JSX.Element {
  const { category = '' } = useParams()
  const [items, setItems] = useState<StoredItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')

  const refresh = useCallback(async () => {
    const result = await window.topolome.listItems(category)
    setItems(result)
    setLoading(false)
  }, [category])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  const handleToggleArchive = useCallback(
    async (item: StoredItem) => {
      await window.topolome.updateItem(category, item.id, { archived: !item.archived })
      await refresh()
    },
    [category, refresh]
  )

  const handleDelete = useCallback(
    async (item: StoredItem) => {
      await window.topolome.deleteItem(category, item.id)
      await refresh()
    },
    [category, refresh]
  )

  const handleSave = useCallback(
    async (item: StoredItem, patch: { title: string; description: string }) => {
      await window.topolome.updateItem(category, item.id, patch)
      await refresh()
    },
    [category, refresh]
  )

  const handleCreate = useCallback(async () => {
    if (!draftTitle.trim()) {
      setAdding(false)
      return
    }
    await window.topolome.createItem(category, {
      title: draftTitle,
      description: draftDescription
    })
    setDraftTitle('')
    setDraftDescription('')
    setAdding(false)
    await refresh()
  }, [category, draftTitle, draftDescription, refresh])

  const visible = showArchived ? items : items.filter((i) => !i.archived)
  const archivedCount = items.filter((i) => i.archived).length
  const activeCount = items.length - archivedCount

  return (
    <div className="px-8 py-12">
      <div className="mb-8 flex items-baseline justify-between border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{category}</h1>
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              {showArchived ? 'hide' : 'show'} archived ({archivedCount})
            </button>
          )}
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {activeCount} item{activeCount === 1 ? '' : 's'}
          </span>
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            + item
          </Button>
        </div>
      </div>

      {adding && (
        <Card className="mb-6 gap-2 rounded-none border-primary/50 p-4">
          <Input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <Textarea
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            placeholder="description"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              cancel
            </Button>
            <Button size="sm" onClick={handleCreate}>
              add
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">loading…</p>
      ) : (
        <CategoryItemList
          items={visible}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
