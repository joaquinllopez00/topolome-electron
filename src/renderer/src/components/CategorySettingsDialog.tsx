import { useEffect, useState } from "react";
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
  const [catalog, setCatalog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Load the category's manifest and the global source catalog on open.
  useEffect(() => {
    if (!open) return;
    Promise.all([window.topolome.getCategoryMeta(category), window.topolome.getConfig()]).then(
      ([meta, config]) => {
        setDescription(meta.description);
        setSources(meta.sources);
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

        <div className="px-5 py-5">
          <FieldGroup className="gap-6 overflow-y-auto">
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
          </FieldGroup>
        </div>

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
