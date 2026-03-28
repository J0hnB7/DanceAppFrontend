// 12 evenly-spaced hues for category color coding
const HUES = [210, 160, 30, 270, 340, 80, 190, 50, 300, 130, 0, 240] as const;

type ColorState = "done" | "running" | "future";

export function getCategoryColor(index: number, state: ColorState): string {
  const h = HUES[index % HUES.length];
  if (state === "done")    return `hsla(${h}, 60%, 58%, 0.32)`;
  if (state === "running") return `hsla(${h}, 75%, 62%, 1)`;
  return                          `hsla(${h}, 45%, 48%, 0.18)`;
}

export function getCategoryBorder(index: number, state: ColorState): string {
  const h = HUES[index % HUES.length];
  if (state === "done")    return `hsla(${h}, 65%, 65%, 0.5)`;
  if (state === "running") return `hsla(${h}, 85%, 72%, 1)`;
  return                          `hsla(${h}, 45%, 55%, 0.25)`;
}

export function getCategoryDot(index: number): string {
  const h = HUES[index % HUES.length];
  return `hsla(${h}, 70%, 60%, 1)`;
}
