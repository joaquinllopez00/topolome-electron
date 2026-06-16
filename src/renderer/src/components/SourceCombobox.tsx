import { useRef, useState } from "react";
import { X } from "lucide-react";

interface SourceComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Catalog of known sources to suggest from. */
  suggestions: string[];
  placeholder?: string;
}

/**
 * Multi-select for a category's sources: pick from the catalog or type a new
 * one. Typed-and-committed values are returned as-is; the store merges any new
 * ones back into the global catalog on save.
 */
export function SourceCombobox({
  value,
  onChange,
  suggestions,
  placeholder,
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
  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(q),
  );
  const canCreate =
    !!query.trim() &&
    !suggestions.some((s) => s.toLowerCase() === q) &&
    !value.includes(query.trim());

  return (
    <div className="relative">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 border border-transparent border-b-input py-1.5 focus-within:border-b-ring">
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
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Delay so a click on a suggestion lands before the list unmounts.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
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

      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto bg-popover py-1 shadow-md ring-1 ring-foreground/10">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s)}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {s}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(query)}
              className="block w-full px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Add “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
