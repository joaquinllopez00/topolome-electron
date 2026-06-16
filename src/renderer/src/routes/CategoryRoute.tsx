import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import type { ItemView, StoredItem } from "@/types";
import { cn } from "@/lib/utils";
import { CategoryItemList } from "../components/CategoryItemList";
import { CategorySettingsDialog } from "../components/CategorySettingsDialog";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export default function CategoryRoute(): React.JSX.Element {
  const { category = "" } = useParams();
  const [items, setItems] = useState<StoredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [view, setView] = useState<ItemView>("grid");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const result = await window.topolome.listItems(category);
    setItems(result);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Live-update the open category as the agent writes item files. `refresh`
  // doesn't toggle the loading flag, so this updates silently (no flicker).
  useEffect(() => window.topolome.onStoreChanged(refresh), [refresh]);

  // Item layout is a saved appearance preference in config.json.
  useEffect(() => {
    window.topolome.getConfig().then((config) => setView(config.item_view));
  }, []);

  const changeView = useCallback(async (next: ItemView) => {
    setView(next);
    await window.topolome.setConfig({ item_view: next });
  }, []);

  const handleToggleArchive = useCallback(
    async (item: StoredItem) => {
      await window.topolome.updateItem(category, item.id, { archived: !item.archived });
      await refresh();
    },
    [category, refresh],
  );

  const handleDelete = useCallback(
    async (item: StoredItem) => {
      await window.topolome.deleteItem(category, item.id);
      await refresh();
    },
    [category, refresh],
  );

  const handleSave = useCallback(
    async (item: StoredItem, patch: { title: string; description: string }) => {
      await window.topolome.updateItem(category, item.id, patch);
      await refresh();
    },
    [category, refresh],
  );

  const handleCreate = useCallback(async () => {
    if (!draftTitle.trim()) {
      setAdding(false);
      return;
    }
    await window.topolome.createItem(category, {
      title: draftTitle,
      description: draftDescription,
    });
    setDraftTitle("");
    setDraftDescription("");
    setAdding(false);
    await refresh();
  }, [category, draftTitle, draftDescription, refresh]);

  const visible = showArchived ? items : items.filter((i) => !i.archived);
  const archivedCount = items.filter((i) => i.archived).length;
  const activeCount = items.length - archivedCount;

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
              {showArchived ? "hide" : "show"} archived ({archivedCount})
            </button>
          )}
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {activeCount} item{activeCount === 1 ? "" : "s"}
          </span>
          <div className="flex items-center border border-border">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Grid view"
              className={cn("rounded-none", view === "grid" && "bg-secondary text-foreground")}
              onClick={() => changeView("grid")}
            >
              <LayoutGrid />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="List view"
              className={cn(
                "rounded-none border-l border-border",
                view === "list" && "bg-secondary text-foreground",
              )}
              onClick={() => changeView("list")}
            >
              <List />
              <span className="sr-only">List view</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Category settings"
            onClick={() => setSettingsOpen(true)}
          >
            <SlidersHorizontal />
            <span className="sr-only">Category settings</span>
          </Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            + item
          </Button>
        </div>
      </div>

      <CategorySettingsDialog
        category={category}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {adding && (
        <Card className="mb-6 gap-2 rounded-none border-primary/50 p-4">
          <Input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="title"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setAdding(false);
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
          category={category}
          view={view}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
