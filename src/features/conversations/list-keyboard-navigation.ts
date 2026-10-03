export function getConversationTargetIndex(
  key: string,
  currentIndex: number,
  optionCount: number,
): number | null {
  if (optionCount === 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return optionCount - 1;
  if (key === "ArrowDown") return Math.min(currentIndex + 1, optionCount - 1);
  if (key === "ArrowUp") return Math.max(currentIndex - 1, 0);
  return null;
}
