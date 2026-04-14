const AVATAR_COLORS = [
  "#4b77e5", "#e5674b", "#4be57a", "#e5c44b",
  "#9b4be5", "#4be5d4", "#e54b9b", "#7ae54b",
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
