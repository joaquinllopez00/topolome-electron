import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
  Check,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import type { StoredItem } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ItemActionDialog } from "./ItemActionDialog";

function formatModifiedAt(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}/${yy}, ${hh}:${min}`;
}

interface CategoryItemProps {
  item: StoredItem;
  category: string;
  onToggleArchive: (item: StoredItem) => void;
  onDelete: (item: StoredItem) => void;
  onSave: (item: StoredItem, patch: { title: string; description: string }) => void;
}

/** A single item card within a category. Supports inline edit, archive, delete. */
export function CategoryItem({
  item,
  category,
  onToggleArchive,
  onDelete,
  onSave,
}: CategoryItemProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [actionOpen, setActionOpen] = useState(false);

  const save = (): void => {
    if (!title.trim()) return;
    onSave(item, { title: title.trim(), description: description.trim() });
    setEditing(false);
  };

  const cancel = (): void => {
    setTitle(item.title);
    setDescription(item.description);
    setEditing(false);
  };

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
    );
  }

  const updateCount = item.updates?.length ?? 0;

  return (
    <Card
      className={cn(
        "group relative h-full gap-3 rounded-none p-4 transition-colors hover:border-primary/50",
        item.archived && "opacity-40",
      )}
    >
      <div className="absolute top-2 right-2 z-10 flex gap-1 border border-border bg-card opacity-0 shadow-sm transition-opacity group-hover:opacity-40 hover:opacity-100">
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => onToggleArchive(item)}
          title={item.archived ? "Unarchive" : "Archive"}
        >
          {item.archived ? <ArchiveRestore /> : <Archive />}
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={() => setEditing(true)} title="Edit">
          <Pencil />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => onDelete(item)}
          title="Delete"
          className="hover:text-destructive"
        >
          <Trash2 />
        </Button>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className="font-semibold text-foreground">{item.title}</h3>
          {item.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          )}
        </div>
        {item.archived && (
          <span className="shrink-0 text-[10px] tracking-wider text-muted-foreground uppercase">
            archived
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {item.suggestedAction && (
          <Button
            variant="secondary"
            onClick={() => setActionOpen(true)}
            className={cn(
              "relative h-auto w-fit max-w-full items-start justify-start gap-1.5 border-border bg-secondary/40 px-2.5 py-1.5 text-left text-xs tracking-normal whitespace-normal normal-case hover:border-primary/50 hover:bg-secondary",
              updateCount > 0 && "pr-7",
            )}
          >
            <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
            <span className="min-w-0 leading-snug font-normal text-foreground line-clamp-2">
              {item.suggestedAction.title}
            </span>
            {updateCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="absolute -top-1.5 -right-1.5 z-10 h-4 min-w-4 border border-border bg-muted px-1 text-[10px] font-medium tracking-normal normal-case tabular-nums"
                  >
                    {updateCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {updateCount} update{updateCount === 1 ? "" : "s"}
                </TooltipContent>
              </Tooltip>
            )}
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3">
          {item.sources?.map((source, i) => (
            <span key={i} className="inline-flex min-w-0 items-center gap-1">
              {i > 0 && <span className="text-muted-foreground/30">·</span>}
              {source.linkToOpen ? (
                <Button
                  variant="ghost"
                  size="xxs"
                  onClick={() => window.topolome.openExternal(source.linkToOpen!)}
                  title={source.linkToOpen}
                  className="max-w-full text-muted-foreground"
                >
                  <ExternalLink />
                  <span className="truncate">{source.sourceFriendlyName}</span>
                </Button>
              ) : (
                <span className="truncate text-[11px] text-muted-foreground">
                  {source.sourceFriendlyName}
                </span>
              )}
            </span>
          ))}
          {item.sources?.length ? <span className="text-muted-foreground/30">·</span> : null}
          <time
            dateTime={new Date(item.modifiedAt).toISOString()}
            title="Last modified"
            className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
          >
            {formatModifiedAt(item.modifiedAt)}
          </time>
        </div>
      </div>

      <ItemActionDialog
        item={item}
        category={category}
        open={actionOpen}
        onOpenChange={setActionOpen}
      />
    </Card>
  );
}
