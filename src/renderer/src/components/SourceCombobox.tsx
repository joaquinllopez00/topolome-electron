import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "./ui/combobox";

interface SourceComboboxProps {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}

export function SourceCombobox({
  id,
  value,
  onChange,
  suggestions,
  placeholder = "Add source…",
}: SourceComboboxProps): React.JSX.Element {
  const anchor = useComboboxAnchor();
  const [inputValue, setInputValue] = useState("");

  const items = useMemo(() => {
    const merged = new Set([...suggestions, ...value]);
    const pending = inputValue.trim();
    if (pending) merged.add(pending);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [suggestions, value, inputValue]);

  const addSource = (raw: string): void => {
    const next = raw.trim();
    if (!next || value.includes(next)) return;
    onChange([...value, next]);
    setInputValue("");
  };

  const handleValueChange = (next: string[] | string | null): void => {
    if (!next) {
      onChange([]);
      return;
    }
    const sources = (Array.isArray(next) ? next : [next])
      .map((s) => s.trim())
      .filter(Boolean);
    onChange(Array.from(new Set(sources)));
    setInputValue("");
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const pending = inputValue.trim();
    if (!pending || value.includes(pending)) return;
    event.preventDefault();
    addSource(pending);
  };

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={handleValueChange}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(sources: string[]) => (
            <>
              {sources.map((source) => (
                <ComboboxChip key={source}>{source}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                placeholder={sources.length === 0 ? placeholder : undefined}
                onKeyDown={handleInputKeyDown}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="z-100">
        <ComboboxEmpty>No sources found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
