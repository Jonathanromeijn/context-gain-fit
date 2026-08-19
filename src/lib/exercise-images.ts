// Generated mapping: exercise name slug -> CDN asset URL.
// Filled by the exercise-image pipeline; entries are added per built-in exercise.
export const EXERCISE_IMAGES: Record<string, string> = {};

export function exerciseImageUrl(name: string): string | undefined {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return EXERCISE_IMAGES[slug];
}
