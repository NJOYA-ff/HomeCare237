const AVATAR_COLORS = [
  "#4b77e5", "#e5674b", "#4be57a", "#e5c44b",
  "#9b4be5", "#4be5d4", "#e54b9b", "#7ae54b",
];

export function avatarColor(name?: string | null): string {
  const safeName = name ?? "";
  let hash = 0;
  for (let i = 0; i < safeName.length; i++)
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
