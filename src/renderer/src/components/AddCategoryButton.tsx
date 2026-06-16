import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface AddCategoryButtonProps {
  onCreate: (name: string, description: string) => void | Promise<void>;
}

export function AddCategoryButton({ onCreate }: AddCategoryButtonProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const reset = (): void => {
    setName("");
    setDescription("");
    setEditing(false);
  };

  const submit = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      reset();
      return;
    }
    await onCreate(trimmed, description);
    reset();
  };

  if (!editing) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing(true)}>
        + new category
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        autoFocus
        value={name}
        placeholder="category name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") reset();
        }}
      />
      <Textarea
        value={description}
        placeholder="what belongs here? (helps the agent file accurately)"
        className="min-h-16 text-[13px]"
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") reset();
        }}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={reset}>
          cancel
        </Button>
        <Button size="sm" onClick={submit}>
          add
        </Button>
      </div>
    </div>
  );
}
