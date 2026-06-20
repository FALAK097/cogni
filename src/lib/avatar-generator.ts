interface GenerateAvatarOptions {
  size?: number;
  format?: string;
  backgroundColor?: string | null;
}

export function generateAvatarUrl(seed: string, options: GenerateAvatarOptions = {}) {
  const { size = 256, format = "svg", backgroundColor = null } = options;

  const baseUrl = "https://api.dicebear.com/7.x/notionists";

  const params = new URLSearchParams({
    seed: seed,
    size: size.toString(),
  });

  if (backgroundColor) {
    params.append("backgroundColor", backgroundColor);
  }

  params.append("randomizeIds", "true");

  return `${baseUrl}/${format}?${params.toString()}`;
}

export function generateRandomAvatarUrl(options: GenerateAvatarOptions = {}) {
  const randomSeed = Math.random().toString(36).substring(7);
  return generateAvatarUrl(randomSeed, options);
}

export function generateUserAvatarUrl(email: string, options: GenerateAvatarOptions = {}) {
  return generateAvatarUrl(email, options);
}

export const AVATAR_BACKGROUND_COLORS = [
  "6366f1",
  "8b5cf6",
  "ec4899",
  "f59e0b",
  "10b981",
  "06b6d4",
  "ef4444",
  "84cc16",
  "3b82f6",
  "e879f9",
  "f43f5e",
  "facc15",
  "22c55e",
  "0ea5e9",
  "dc2626",
  "ea580c",
  "a3e635",
  "2563eb",
  "c026d3",
  "f97316",
  "22d3ee",
  "fbbf24",
];

export function getRandomBackgroundColor() {
  return AVATAR_BACKGROUND_COLORS[Math.floor(Math.random() * AVATAR_BACKGROUND_COLORS.length)];
}

export function getStableBackgroundColor(seed: string) {
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_BACKGROUND_COLORS[hash % AVATAR_BACKGROUND_COLORS.length];
}
