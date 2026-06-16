import type { LoopStatus } from "@/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface LoopBannerProps {
  status: LoopStatus | null;
  onToggle: () => void;
  onViewOutput: () => void;
  onViewSetup: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LoopBanner({
  status,
  onToggle,
  onViewOutput,
  onViewSetup,
}: LoopBannerProps): React.JSX.Element {
  const enabled = status?.enabled ?? false;
  const running = status?.running ?? false;

  const dot = running ? "bg-primary animate-pulse" : enabled ? "bg-primary" : "bg-destructive";

  const label = running
    ? "Pass running"
    : enabled
      ? `Loop active · every ${status?.intervalMinutes}m`
      : "No loop active";

  return (
    <Card className="mx-3 mb-3 gap-3 rounded-none bg-secondary/40 p-3">
      <div className="flex items-center gap-2">
        <span className={`size-2 shrink-0 rounded-full ${dot}`} />
        <span className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</span>
      </div>

      {status?.lastRunAt && !running && (
        <p className="text-[11px] text-muted-foreground">
          Last pass {formatTime(status.lastRunAt)}
          {status.lastExitCode !== 0 && status.lastExitCode !== null && " · failed"}
        </p>
      )}

      {status?.lastError && (
        <p className="line-clamp-2 text-[11px] text-destructive" title={status.lastError}>
          {status.lastError}
        </p>
      )}

      <Button
        variant={enabled ? "secondary" : "default"}
        size="sm"
        className="w-full"
        onClick={onToggle}
      >
        {enabled ? "Stop loop" : "Start loop"}
      </Button>

      <Button variant="outline" size="sm" className="w-full" onClick={onViewOutput}>
        View output
      </Button>

      <Button variant="outline" size="sm" className="w-full" onClick={onViewSetup}>
        How it works
      </Button>
    </Card>
  );
}
