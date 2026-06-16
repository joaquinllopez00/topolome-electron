import { useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { Config } from '@/types'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'

interface SetupInstructionsProps {
  root: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROOT_PLACEHOLDER = '~/.topolome'

/** Build the operating-instructions prompt handed to the `/loop` job. */
function buildLoopPrompt(root: string, config: Config | null): string {
  const sources =
    config && config.sources.length ? config.sources.join(', ') : 'see config.json'
  const tags =
    config && config.tags.length
      ? config.tags.join(', ')
      : '(none defined — create categories as needed)'
  const operator =
    config && config.system_prompt.trim()
      ? config.system_prompt.trim()
      : '(define this in config.json → system_prompt)'

  return `/loop Act as topolome's categorization agent. Run one pass, then wait ~10 minutes and run again.

OPERATOR INSTRUCTIONS (what to collect, from config.json → system_prompt):
${operator}

EACH PASS:
1. Read ${root}/config.json for the live sources, tags, system_prompt, and item_delimiter.
2. Check every source: ${sources}
   Split multi-item content on the configured item_delimiter.
3. For each candidate, decide if it belongs per the operator instructions. Skip anything that doesn't.
4. Pick the single best category. Allowed tags: ${tags}.
   Categories are directories under ${root}/categories/. Reuse an existing one when it fits; otherwise create the directory.
5. Write each new item as its own file:
     ${root}/categories/<category>/<slug>.json
   with EXACTLY this shape: { "title": string, "description": string, "archived": false }
   Use a filesystem-safe slug of the title for <slug>.
6. Dedupe: before writing, read the existing files in the target category and skip items already present.
7. Never delete, overwrite, or unarchive items you didn't create this pass.`
}

export function SetupInstructions({
  root,
  open,
  onOpenChange
}: SetupInstructionsProps): React.JSX.Element {
  const dataRoot = root || ROOT_PLACEHOLDER
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => {
    if (open) window.topolome.getConfig().then(setConfig)
  }, [open])

  const loopPrompt = buildLoopPrompt(dataRoot, config)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Set up the categorization loop</DialogTitle>
          <DialogDescription>
            topolome only visualizes the store. The work is done by a Claude{' '}
            <code className="text-foreground">/loop</code> job you run in your
            terminal — it reads your config, checks your sources, and files items
            into category folders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-5 py-5 leading-relaxed">
          <Step n={1} title="Tell it what to collect">
            <p className="text-muted-foreground">
              Edit the config. The{' '}
              <span className="text-foreground">system_prompt</span> field is where
              you instruct the loop on what to watch for and how to judge it;{' '}
              <span className="text-foreground">sources</span> and{' '}
              <span className="text-foreground">tags</span> define where to look and
              which categories it may use.
            </p>
            <Code>{`${dataRoot}/config.json`}</Code>
          </Step>

          <Step n={2} title="Start the /loop job">
            <p className="text-muted-foreground">
              Open a terminal in your data folder, start Claude, then paste the loop
              command below. It already encodes the operating contract (where to
              write, the item shape, dedupe rules) plus your current config:
            </p>
            <Code>{`cd ${dataRoot} && claude`}</Code>
            <CopyBlock text={loopPrompt} />
          </Step>

          <Step n={3} title="Watch it here">
            <p className="text-muted-foreground">
              As files land in the category folders they show up in topolome —
              re-open a category to refresh. Edit the{' '}
              <span className="text-foreground">system_prompt</span> any time; the
              next pass picks it up.
            </p>
          </Step>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Step({
  n,
  title,
  children
}: {
  n: number
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <span className="flex size-5 items-center justify-center bg-primary text-[11px] text-primary-foreground">
          {n}
        </span>
        {title}
      </h3>
      <div className="space-y-2 pl-7">{children}</div>
    </section>
  )
}

function Code({ children }: { children: string }): React.JSX.Element {
  return (
    <pre className="overflow-x-auto border border-border bg-muted px-3 py-2 text-[12px] whitespace-pre text-foreground">
      {children}
    </pre>
  )
}

function CopyBlock({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative">
      <pre className="max-h-64 overflow-auto border border-border bg-muted px-3 py-2 pr-12 text-[12px] whitespace-pre-wrap text-foreground">
        {text}
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        title="Copy"
        className="absolute top-2 right-2 bg-secondary"
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}
