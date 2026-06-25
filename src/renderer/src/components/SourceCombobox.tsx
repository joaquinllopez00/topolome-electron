import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";

interface SourceComboboxProps {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  /** Catalog of known sources to suggest from. */
  suggestions: string[];
  placeholder?: string;
}

/**
 * Multi-select for a category's sources, built on radix Popover so it composes
 * cleanly inside the radix Dialog. Pick from the catalog or type a new one.
 */
export function SourceCombobox({
  id,
  value,
  onChange,
  suggestions,
  placeholder = "Add source…",
}: SourceComboboxProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string): void => {
    const v = raw.trim();
    setQuery("");
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
  };
  const remove = (v: string): void => onChange(value.filter((s) => s !== v));

  const q = query.trim().toLowerCase();
  const filtered = suggestions.filter((s) => !value.includes(s) && s.toLowerCase().includes(q));
  const canCreate =
    !!query.trim() &&
    !suggestions.some((s) => s.toLowerCase() === q) &&
    !value.includes(query.trim());
  const showList = filtered.length > 0 || canCreate;

  return (
    <Popover open={open && showList} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex min-h-10 flex-wrap items-center gap-1.5 border border-transparent border-b-input py-1.5 focus-within:border-b-ring"
        >
          {value.map((v) => (
            <span
              key={v}
              className="flex h-6 items-center gap-1 bg-muted pr-1 pl-2 text-xs text-foreground"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="text-muted-foreground hover:text-foreground"
                title={`Remove ${v}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(query);
              } else if (e.key === "Backspace" && !query && value.length) {
                remove(value[value.length - 1]);
              }
            }}
            placeholder={value.length === 0 ? placeholder : undefined}
            className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        // Keep focus in the input so the user can keep typing/selecting.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {filtered.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              add(s);
              inputRef.current?.focus();
            }}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            {s}
          </button>
        ))}
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              add(query);
              inputRef.current?.focus();
            }}
            className="block w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Add “{query.trim()}”
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
