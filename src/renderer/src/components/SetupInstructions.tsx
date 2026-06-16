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

export function SetupInstructions({
  root,
  open,
  onOpenChange
}: SetupInstructionsProps): React.JSX.Element {
  const dataRoot = root || ROOT_PLACEHOLDER

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>How topolome works</DialogTitle>
          <DialogDescription>
            topolome runs a Claude agent on an interval that reads your sources
            and files each item into a category folder. Everything lives as plain
            files under <code className="text-foreground">{dataRoot}</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-5 py-5 leading-relaxed">
          <Step n={1} title="Configure it in Settings">
            <p className="text-muted-foreground">
              Open the <span className="text-foreground">gear icon</span> (top
              right) to set the{' '}
              <span className="text-foreground">system prompt</span> (what to
              collect and how to judge it),{' '}
              <span className="text-foreground">sources</span>,{' '}
              <span className="text-foreground">tags</span>, the{' '}
              <span className="text-foreground">interval</span>, and the agent{' '}
              <span className="text-foreground">permission mode</span>. These are
              written to <code className="text-foreground">config.json</code> —
              you can also edit that file directly.
            </p>
            <Code>{`${dataRoot}/config.json`}</Code>
          </Step>

          <Step n={2} title="Start the loop">
            <p className="text-muted-foreground">
              Hit <span className="text-foreground">Start loop</span> in the
              sidebar. topolome runs one agent pass immediately, then again every
              interval. Each pass reads your sources, then writes new items as{' '}
              <code className="text-foreground">
                {`categories/<category>/<slug>.json`}
              </code>
              . Watch progress live with{' '}
              <span className="text-foreground">View output</span>; a pass never
              starts while the previous one is still running.
            </p>
          </Step>

          <Step n={3} title="Prerequisites (one-time)">
            <p className="text-muted-foreground">
              The pass runs the <code className="text-foreground">claude</code>{' '}
              CLI for you, so it needs:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                The <code className="text-foreground">claude</code> CLI installed
                and <span className="text-foreground">logged in</span> (run{' '}
                <code className="text-foreground">claude</code> once in a terminal
                to authenticate).
              </li>
              <li>
                Any source that's an MCP server (e.g.{' '}
                <span className="text-foreground">Slack</span>) configured and
                authorized in Claude — otherwise the pass can&apos;t read it.
              </li>
              <li>
                Permission mode set to{' '}
                <span className="text-foreground">Full access</span> in Settings
                if your sources use MCP or Bash;{' '}
                <span className="text-foreground">File edits only</span> blocks
                them.
              </li>
            </ul>
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
