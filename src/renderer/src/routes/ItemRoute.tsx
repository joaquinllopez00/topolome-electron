import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FolderOpen, Send } from "lucide-react";
import type { StoredItem } from "@/types";
import { Shell, ShellActions, ShellHeader, ShellTitle } from "../components/Shell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export default function ItemRoute(): React.JSX.Element {
  const { category = "", itemId = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<StoredItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [dir, setDir] = useState("");
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const items = await window.topolome.listItems(category);
    setItem(items.find((i) => i.id === itemId) ?? null);
    setLoading(false);
  }, [category, itemId]);

  useEffect(() => {
    refresh();
    return window.topolome.onStoreChanged(refresh);
  }, [refresh]);

  // Seed the editable start prompt once the suggested action loads.
  useEffect(() => {
    if (item?.suggestedAction) setPrompt(item.suggestedAction.sessionStartPrompt);
  }, [item?.suggestedAction?.sessionStartPrompt]);

  const session = item?.actionSession;
  const action = item?.suggestedAction;

  const start = async (): Promise<void> => {
    if (!dir.trim() || !prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await window.topolome.startSession({
        category,
        itemId,
        dir: dir.trim(),
        prompt: prompt.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const send = async (): Promise<void> => {
    const msg = message.trim();
    if (!msg) return;
    setBusy(true);
    setError(null);
    try {
      await window.topolome.sendToSession({ category, itemId, message: msg });
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">loading…</p>
      </Shell>
    );
  }
  if (!item) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Item not found.</p>
      </Shell>
    );
  }

  const timeline = [...(item.updates ?? [])].sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));

  return (
    <Shell>
      <ShellHeader>
        <ShellTitle>{item.title}</ShellTitle>
        <ShellActions>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${encodeURIComponent(category)}`)}
          >
            <ArrowLeft /> {category}
          </Button>
        </ShellActions>
      </ShellHeader>

      {item.description && (
        <p className="mb-5 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {item.description}
        </p>
      )}

      {item.sources?.length ? (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.sources.map((s, i) =>
            s.linkToOpen ? (
              <Button
                key={i}
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                title={s.linkToOpen}
                onClick={() => window.topolome.openExternal(s.linkToOpen!)}
              >
                <ExternalLink /> {s.sourceFriendlyName}
              </Button>
            ) : (
              <span key={i} className="text-[11px] text-muted-foreground uppercase">
                {s.sourceFriendlyName}
              </span>
            ),
          )}
        </div>
      ) : null}

      {/* Timeline of the user's prompts and the agent's progress. */}
      {timeline.length > 0 && (
        <ul className="mb-6 space-y-4 border-l border-border pl-4">
          {timeline.map((u, i) => (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[21px] top-1.5 size-2 rounded-full ${
                  u.role === "user" ? "bg-primary" : "bg-muted-foreground"
                }`}
              />
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {u.role === "user" ? "You" : "Agent"}
                </span>
                {u.at && (
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(u.at).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{u.text}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Composer: start a session, or reply to the existing one. */}
      {session ? (
        <div className="space-y-2 border-t border-border pt-4">
          {action && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessage(action.sessionStartPrompt)}
            >
              Use suggested action
            </Button>
          )}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Send a follow-up to this session… (⌘↵ to send)"
            className="min-h-16"
          />
          <div className="flex items-center justify-between">
            <code className="truncate text-[11px] text-muted-foreground" title={session.dir}>
              claude --resume {session.id}
            </code>
            <Button onClick={send} disabled={!message.trim() || busy}>
              <Send /> {busy ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 border-t border-border pt-4">
          {action && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrompt(action.sessionStartPrompt)}
            >
              Use suggested action
            </Button>
          )}
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what the Claude session should do…"
            className="min-h-24 font-mono text-[12px]"
          />
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
            <Button onClick={start} disabled={!dir.trim() || !prompt.trim() || busy}>
              {busy ? "Starting…" : "Start session"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
    </Shell>
  );
}
