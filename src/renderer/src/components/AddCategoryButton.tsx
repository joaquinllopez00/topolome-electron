import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface AddCategoryButtonProps {
  onCreate: (name: string) => void | Promise<void>;
}

export function AddCategoryButton({ onCreate }: AddCategoryButtonProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const submit = async (): Promise<void> => {
    const name = value.trim();
    if (name) await onCreate(name);
    setValue("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing(true)}>
        + new category
      </Button>
    );
  }

  return (
    <Input
      autoFocus
      value={value}
      placeholder="category name"
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          setValue("");
          setEditing(false);
        }
      }}
    />
  );
}
