import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { CategoryList } from './components/CategoryList'
import { AddCategoryButton } from './components/AddCategoryButton'
import { LoopBanner } from './components/LoopBanner'
import { SetupInstructions } from './components/SetupInstructions'
import { SettingsDialog } from './components/SettingsDialog'
import { LoopOutput } from './components/LoopOutput'
import { Button } from './components/ui/button'
import { AppLogo } from './components/AppLogo'
import { applyTheme } from './lib/theme'
import type { LoopStatus } from './types'

export default function App(): React.JSX.Element {
  const [categories, setCategories] = useState<string[]>([])
  const [root, setRoot] = useState<string>('')
  const [setupOpen, setSetupOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [outputOpen, setOutputOpen] = useState(false)
  const [loop, setLoop] = useState<LoopStatus | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const refresh = useCallback(async () => {
    setCategories(await window.topolome.listCategories())
  }, [])

  useEffect(() => {
    refresh()
    window.topolome.getStoreRoot().then(setRoot)
    window.topolome.getLoopStatus().then(setLoop)
    // Reconcile the instant-applied theme against the canonical config value.
    window.topolome.getConfig().then((config) => applyTheme(config.theme))
    return window.topolome.onLoopStatus(setLoop)
  }, [refresh])

  const handleToggleLoop = useCallback(async () => {
    if (loop?.enabled) {
      setLoop(await window.topolome.stopLoop())
    } else {
      setLoop(await window.topolome.startLoop())
    }
  }, [loop?.enabled])

  const activePath = decodeURIComponent(location.pathname.replace(/^\//, ''))

  const handleCreate = useCallback(
    async (name: string) => {
      await window.topolome.createCategory(name)
      await refresh()
    },
    [refresh]
  )

  const handleRename = useCallback(
    async (from: string, to: string) => {
      const saved = await window.topolome.renameCategory(from, to)
      await refresh()
      if (activePath === from) navigate(`/${encodeURIComponent(saved)}`)
    },
    [refresh, navigate, activePath]
  )

  const handleDelete = useCallback(
    async (name: string) => {
      await window.topolome.deleteCategory(name)
      await refresh()
      if (activePath === name) navigate('/')
    },
    [refresh, navigate, activePath]
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Full-width draggable title bar. pl-20 reserves room for the macOS
          traffic-light window controls so nothing renders underneath them. */}
      <header
        className="flex h-10 shrink-0 items-center border-b border-border bg-card pr-4 pl-20"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <AppLogo />
        <span className="ml-2 text-xs font-semibold tracking-widest uppercase">
          topolome
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSettingsOpen(true)}
          title="Configuration"
          className="ml-auto focus-visible:border-transparent focus-visible:ring-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Settings />
          <span className="sr-only">Configuration</span>
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
          <div className="flex-1 overflow-y-auto py-2">
            <CategoryList
              categories={categories}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          </div>

          <LoopBanner
            status={loop}
            onToggle={handleToggleLoop}
            onViewOutput={() => setOutputOpen(true)}
            onViewSetup={() => setSetupOpen(true)}
          />

          <div className="border-t border-border p-3">
            <AddCategoryButton onCreate={handleCreate} />
            <p
              className="mt-3 truncate text-[11px] text-muted-foreground"
              title={root}
            >
              {root || '~/.topolome'}
            </p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <SetupInstructions root={root} open={setupOpen} onOpenChange={setSetupOpen} />
      <SettingsDialog
        root={root}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <LoopOutput open={outputOpen} onOpenChange={setOutputOpen} />
    </div>
  )
}
