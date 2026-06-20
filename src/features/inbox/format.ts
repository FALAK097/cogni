export function formatConversationTime(date: Date) {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat("en", {
    ...(sameDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" }),
  }).format(date);
}

export function formatMessageTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
