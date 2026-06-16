import { useEffect, useState } from 'react'
import type { Config, LoopPermissionMode, Theme } from '@/types'
import { applyTheme } from '../lib/theme'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog'

interface SettingsDialogProps {
  root: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (config: Config) => void
}

/** One value per line; blank lines are dropped. */
function toLines(values: string[]): string {
  return values.join('\n')
}
function fromLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function SettingsDialog({
  root,
  open,
  onOpenChange,
  onSaved
}: SettingsDialogProps): React.JSX.Element {
  const [sources, setSources] = useState('')
  const [tags, setTags] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [itemDelimiter, setItemDelimiter] = useState('')
  const [intervalMinutes, setIntervalMinutes] = useState('10')
  const [permissionMode, setPermissionMode] =
    useState<LoopPermissionMode>('bypassPermissions')
  const [theme, setTheme] = useState<Theme>('dark')
  const [saving, setSaving] = useState(false)

  // Load the live config each time the dialog opens so values stay current.
  useEffect(() => {
    if (!open) return
    window.topolome.getConfig().then((config) => {
      setSources(toLines(config.sources))
      setTags(toLines(config.tags))
      setSystemPrompt(config.system_prompt)
      setItemDelimiter(config.item_delimiter)
      setIntervalMinutes(String(config.loop_interval_minutes))
      setPermissionMode(config.loop_permission_mode)
      setTheme(config.theme)
    })
  }, [open])

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      const parsedInterval = Math.max(1, Math.round(Number(intervalMinutes) || 0))
      const saved = await window.topolome.setConfig({
        sources: fromLines(sources),
        tags: fromLines(tags),
        system_prompt: systemPrompt.trim(),
        item_delimiter: itemDelimiter,
        loop_interval_minutes: parsedInterval,
        loop_permission_mode: permissionMode,
        theme
      })
      applyTheme(saved.theme)
      onSaved?.(saved)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Configuration</DialogTitle>
          <DialogDescription>
            Edits write to{' '}
            <code className="text-foreground">
              {(root || '~/.topolome') + '/config.json'}
            </code>
            . The next <code className="text-foreground">/loop</code> pass picks
            them up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-5 py-5">
          <Field label="Theme" hint="Color theme for the app.">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-sm outline-none focus-visible:border-b-ring"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </Field>

          <Field
            label="System prompt"
            hint="What the loop should collect and how to judge it."
          >
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-28"
              placeholder="You categorize incoming items…"
            />
          </Field>

          <Field label="Sources" hint="Where to look — one per line.">
            <Textarea
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              className="min-h-20 font-mono text-[13px]"
              placeholder={'https://example.com/feed\n~/notes/inbox.md'}
            />
          </Field>

          <Field
            label="Tags"
            hint="Categories the loop may use — one per line."
          >
            <Textarea
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="min-h-20 font-mono text-[13px]"
              placeholder={'urgent\nread-later'}
            />
          </Field>

          <Field
            label="Loop interval (minutes)"
            hint="How often the app runs an agent pass while the loop is active."
          >
            <Input
              type="number"
              min={1}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
              className="font-mono"
            />
          </Field>

          <Field
            label="Agent permissions"
            hint="What each pass may do unattended. Bypass is required for MCP/Bash sources (e.g. Slack); accept-edits is safer but limits the agent to file edits only."
          >
            <select
              value={permissionMode}
              onChange={(e) =>
                setPermissionMode(e.target.value as LoopPermissionMode)
              }
              className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-sm outline-none focus-visible:border-b-ring"
            >
              <option value="bypassPermissions">
                Full access (bypass permissions)
              </option>
              <option value="acceptEdits">File edits only (safer)</option>
            </select>
          </Field>

          <Field
            label="Item delimiter"
            hint="String used to split multi-item source content (newlines allowed)."
          >
            <Textarea
              value={itemDelimiter}
              onChange={(e) => setItemDelimiter(e.target.value)}
              className="min-h-16 font-mono text-[13px]"
              placeholder={'\n---\n'}
            />
          </Field>
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="space-y-1">
      <label className="text-xs font-semibold tracking-widest text-foreground uppercase">
        {label}
      </label>
      <p className="text-[12px] text-muted-foreground">{hint}</p>
      {children}
    </section>
  )
}
