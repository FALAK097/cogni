export function getConversationTargetIndex(
  key: string,
  currentIndex: number,
  optionCount: number,
): number | null {
  if (optionCount === 0) return null;
  const boundedIndex = Math.max(0, Math.min(currentIndex, optionCount - 1));
  if (key === "Home") return 0;
  if (key === "End") return optionCount - 1;
  if (key === "ArrowDown") return Math.min(boundedIndex + 1, optionCount - 1);
  if (key === "ArrowUp") return Math.max(boundedIndex - 1, 0);
  return null;
}
