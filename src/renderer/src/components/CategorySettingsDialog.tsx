import { useEffect, useState } from "react";
import type { LoopMode } from "@/types";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { SourceCombobox } from "./SourceCombobox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "./ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface CategorySettingsDialogProps {
  category: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function CategorySettingsDialog({
  category,
  open,
  onOpenChange,
  onSaved,
}: CategorySettingsDialogProps): React.JSX.Element {
  const [description, setDescription] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [loopMode, setLoopMode] = useState<LoopMode>("main");
  const [catalog, setCatalog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Load the category's manifest and the global source catalog on open.
  useEffect(() => {
    if (!open) return;
    Promise.all([window.topolome.getCategoryMeta(category), window.topolome.getConfig()]).then(
      ([meta, config]) => {
        setDescription(meta.description);
        setSources(meta.sources);
        setLoopMode(meta.loopMode);
        setCatalog(config.sources);
      },
    );
  }, [open, category]);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await window.topolome.setCategoryMeta(category, {
        description: description.trim(),
        sources,
        loopMode,
      });
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{category} · settings</DialogTitle>
          <DialogDescription>
            Scope what this category collects. Saved to{" "}
            <code className="text-foreground">category.json</code> in the folder.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-6 overflow-y-auto px-5 py-5">
          <Field>
            <FieldLabel htmlFor="cat-description">Description</FieldLabel>
            <FieldDescription>
              What belongs here — be specific so the agent isn&apos;t guessing.
            </FieldDescription>
            <Textarea
              id="cat-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28"
              placeholder="Explicit asks directed at me with a clear action — not FYIs."
            />
          </Field>
          <Field>
            <FieldLabel>Sources</FieldLabel>
            <FieldDescription>
              Pick from the catalog or type a new one — new entries are added to the catalog.
            </FieldDescription>
            <SourceCombobox
              value={sources}
              onChange={setSources}
              suggestions={catalog}
              placeholder="slack-dms"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="cat-loop-mode">Loop</FieldLabel>
            <FieldDescription>
              How this category is collected. Main loop shares one pass with the others; dedicated
              runs its own pass each tick; off pauses collection.
            </FieldDescription>
            <select
              id="cat-loop-mode"
              value={loopMode}
              onChange={(e) => setLoopMode(e.target.value as LoopMode)}
              className="h-10 w-full border border-transparent border-b-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-b-ring"
            >
              <option value="main">Main loop (shared pass)</option>
              <option value="dedicated">Dedicated (own pass)</option>
              <option value="off">Off (not collected)</option>
            </select>
          </Field>
        </FieldGroup>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
