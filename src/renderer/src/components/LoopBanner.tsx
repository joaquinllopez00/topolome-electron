import { Button } from './ui/button'
import { Card } from './ui/card'

interface LoopBannerProps {
  onViewSetup: () => void
}

export function LoopBanner({ onViewSetup }: LoopBannerProps): React.JSX.Element {
  return (
    <Card className="mx-3 mb-3 gap-3 rounded-none bg-secondary/40 p-3">
      <div className="flex items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-destructive" />
        <span className="text-[11px] tracking-widest text-muted-foreground uppercase">
          No loop active
        </span>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={onViewSetup}>
        View setup instructions
      </Button>
    </Card>
  )
}
