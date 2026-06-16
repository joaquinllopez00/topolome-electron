import { useState } from "react";
import { Copy, Check, FolderOpen } from "lucide-react";
import type { StoredItem } from "@/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ItemActionDialogProps {
  item: StoredItem;
  category: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CopyButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title="Copy"
      className="absolute top-2 right-2 bg-secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

export function ItemActionDialog({
  item,
  category,
  open,
  onOpenChange,
}: ItemActionDialogProps): React.JSX.Element {
  const action = item.suggestedAction;
  const [dir, setDir] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (): Promise<void> => {
    if (!action || !dir.trim()) return;
    setStarting(true);
    setError(null);
    try {
      const { sessionId } = await window.topolome.startSession({
        category,
        itemId: item.id,
        dir: dir.trim(),
        prompt: action.sessionStartPrompt,
      });
      setSessionId(sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  };

  const resumeCommand = sessionId ? `cd ${dir.trim()} && claude --resume ${sessionId}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>
            {action ? action.title : "Item activity"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
          {action && (
            <section className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Suggested prompt
                </p>
                <div className="relative">
                  <pre className="max-h-48 overflow-auto border border-border bg-muted px-3 py-2 pr-12 text-[12px] whitespace-pre-wrap text-foreground">
                    {action.sessionStartPrompt}
                  </pre>
                  <CopyButton text={action.sessionStartPrompt} />
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Working directory
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={dir}
                    onChange={(e) => setDir(e.target.value)}
                    placeholder="/path/to/project"
                    className="font-mono text-[13px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const picked = await window.topolome.pickDirectory();
                      if (picked) setDir(picked);
                    }}
                  >
                    <FolderOpen /> Browse
                  </Button>
                </div>
              </div>

              {!sessionId ? (
                <Button onClick={start} disabled={!dir.trim() || starting}>
                  {starting ? "Starting session…" : "Start Claude session"}
                </Button>
              ) : (
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Session started — resume it with
                  </p>
                  <div className="relative">
                    <pre className="overflow-x-auto border border-border bg-muted px-3 py-2 pr-12 text-[12px] whitespace-pre-wrap text-foreground">
                      {resumeCommand}
                    </pre>
                    <CopyButton text={resumeCommand} />
                  </div>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    It runs in the background and writes progress into this item — see updates below.
                  </p>
                </div>
              )}

              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </section>
          )}

          {item.updates?.length ? (
            <section className="space-y-2">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Updates
              </p>
              <ul className="space-y-2">
                {item.updates.map((u, i) => (
                  <li key={i} className="border-l-2 border-border pl-3">
                    {u.at && (
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(u.at).toLocaleString()}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap text-foreground">{u.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            !action && (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
