import { useEffect, useState } from "react";
import type { Config, LoopPermissionMode, Theme } from "@/types";
import { applyTheme } from "../lib/theme";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "./ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface SettingsDialogProps {
  root: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (config: Config) => void;
}

/** One value per line; blank lines are dropped. */
function toLines(values: string[]): string {
  return values.join("\n");
}
function fromLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function SettingsDialog({
  root,
  open,
  onOpenChange,
  onSaved,
}: SettingsDialogProps): React.JSX.Element {
  const [sources, setSources] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState("10");
  const [permissionMode, setPermissionMode] = useState<LoopPermissionMode>("bypassPermissions");
  const [theme, setTheme] = useState<Theme>("dark");
  const [saving, setSaving] = useState(false);

  // Load the live config each time the dialog opens so values stay current.
  useEffect(() => {
    if (!open) return;
    window.topolome.getConfig().then((config) => {
      setSources(toLines(config.sources));
      setSystemPrompt(config.system_prompt);
      setIntervalMinutes(String(config.loop_interval_minutes));
      setPermissionMode(config.loop_permission_mode);
      setTheme(config.theme);
    });
  }, [open]);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const parsedInterval = Math.max(1, Math.round(Number(intervalMinutes) || 0));
      const saved = await window.topolome.setConfig({
        sources: fromLines(sources),
        system_prompt: systemPrompt.trim(),
        loop_interval_minutes: parsedInterval,
        loop_permission_mode: permissionMode,
        theme,
      });
      applyTheme(saved.theme);
      onSaved?.(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Configuration</DialogTitle>
          <DialogDescription>
            Edits write to{" "}
            <code className="text-foreground">{(root || "~/.topolome") + "/config.json"}</code>. The
            next <code className="text-foreground">/loop</code> pass picks them up.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-6 overflow-y-auto px-5 py-5">
          <Field>
            <FieldLabel htmlFor="theme">Theme</FieldLabel>
            <FieldDescription>Color theme for the app.</FieldDescription>

            <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="system-prompt">System prompt</FieldLabel>
            <FieldDescription>What the loop should collect and how to judge it.</FieldDescription>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-28"
              placeholder="You categorize incoming items…"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="sources">Sources</FieldLabel>
            <FieldDescription>Where to look — one per line.</FieldDescription>
            <Textarea
              id="sources"
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              className="min-h-20 font-mono text-[13px]"
              placeholder={"https://example.com/feed\n~/notes/inbox.md"}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="loop-interval">Loop interval (minutes)</FieldLabel>
            <FieldDescription>
              How often the app runs an agent pass while the loop is active.
            </FieldDescription>
            <Input
              id="loop-interval"
              type="number"
              min={1}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="permission-mode">Agent permissions</FieldLabel>
            <FieldDescription>
              What each pass may do unattended. Bypass is required for MCP/Bash sources (e.g.
              Slack); accept-edits is safer but limits the agent to file edits only.
            </FieldDescription>
            <select
              id="permission-mode"
              value={permissionMode}
              onChange={(e) => setPermissionMode(e.target.value as LoopPermissionMode)}
              className="h-10 w-full border border-transparent border-b-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-b-ring"
            >
              <option value="bypassPermissions">Full access (bypass permissions)</option>
              <option value="acceptEdits">File edits only (safer)</option>
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
