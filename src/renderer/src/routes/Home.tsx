import { useEffect, useState } from 'react'
import type { Config } from '@/types'

export default function Home(): React.JSX.Element {
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => {
    window.topolome.getConfig().then(setConfig)
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-8 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">topolome</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A window into the local Claude categorization loop. Pick a category on the
        left, or watch the agent file new items in.
      </p>

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          config
        </h2>
        {config ? (
          <dl className="space-y-2 border border-border bg-card p-4 text-sm">
            <Row label="sources" value={config.sources.join(', ') || '—'} />
            <Row label="tags" value={config.tags.join(', ') || '—'} />
            <Row label="item_delimiter" value={JSON.stringify(config.item_delimiter)} />
            <div>
              <dt className="text-muted-foreground">system_prompt</dt>
              <dd className="mt-1 whitespace-pre-wrap text-foreground">
                {config.system_prompt}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">loading…</p>
        )}
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex gap-3">
      <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}
