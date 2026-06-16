import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

interface LoopOutputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoopOutput({ open, onOpenChange }: LoopOutputProps): React.JSX.Element {
  const [logs, setLogs] = useState("");
  const preRef = useRef<HTMLPreElement>(null);

  // Load the buffered history on open, then append live chunks.
  useEffect(() => {
    if (!open) return;
    window.topolome.getLoopLogs().then(setLogs);
    return window.topolome.onLoopOutput((chunk) => setLogs((prev) => prev + chunk));
  }, [open]);

  // Keep the view pinned to the latest output.
  useLayoutEffect(() => {
    const el = preRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Loop output</DialogTitle>
          <DialogDescription>
            Live output from the categorization agent. Updates as each pass runs.
          </DialogDescription>
        </DialogHeader>

        <pre
          ref={preRef}
          className="m-0 flex-1 overflow-auto bg-muted px-5 py-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-foreground"
        >
          {logs || "No output yet — start the loop to see it here."}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
