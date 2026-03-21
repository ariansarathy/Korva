"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const themeOrder: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const Icon = themeIcons[theme];

  return (
    <button
      onClick={cycle}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      title={`Theme: ${theme}`}
      aria-label={`Switch theme (current: ${theme})`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
