import { cn } from "@/lib/utils";

/** Composable page shell shared by the category and item routes. */
export function Shell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return <div className={cn("px-8 py-12", className)}>{children}</div>;
}

export function ShellHeader({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-border pb-4">
      {children}
    </div>
  );
}

export function ShellTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{children}</h1>;
}

export function ShellActions({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="flex shrink-0 items-center gap-3">{children}</div>;
}

export function ShellContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return <div className={className}>{children}</div>;
}
