import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-primary", className)}
    >
      <rect
        x="0.5"
        y="0.5"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
      />
      <rect x="8" y="0" width="8" height="8" fill="currentColor" />
    </svg>
  );
}
