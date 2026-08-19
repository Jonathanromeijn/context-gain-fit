// Generated mapping: exercise name slug -> CDN asset URL.
// Filled by the exercise-image pipeline; entries are added per built-in exercise.
export const EXERCISE_IMAGES: Record<string, string> = {
  "ab-wheel-rollout": "/__l5e/assets-v1/2e44b531-b8dd-45bf-975c-d50706c58b8a/ab-wheel-rollout.png",
  "arnold-press": "/__l5e/assets-v1/db3386a9-ecb8-447b-b7a1-f70377fb9c99/arnold-press.png",
  "back-extension": "/__l5e/assets-v1/a28681d4-5506-45e9-8784-71a9672e5fc0/back-extension.png",
  "back-squat": "/__l5e/assets-v1/17dc5b50-2b87-4915-a185-301b98c6e238/back-squat.png",
  "barbell-bench-press": "/__l5e/assets-v1/274ac3f5-e84e-4001-a686-5de74fe8e3ee/barbell-bench-press.png",
  "barbell-curl": "/__l5e/assets-v1/bc085cf1-b219-4071-babf-e93f0ef5a37a/barbell-curl.png",
  "barbell-row": "/__l5e/assets-v1/0f87742c-fae6-4a68-b305-c26b3570881c/barbell-row.png",
  "barbell-shrug": "/__l5e/assets-v1/e72be2fe-ab3b-4bc5-83e5-12fd61b69829/barbell-shrug.png",
  "bulgarian-split-squat": "/__l5e/assets-v1/59645849-99ca-4dfd-9246-6f3e073ae379/bulgarian-split-squat.png",
  "cable-chest-fly": "/__l5e/assets-v1/28d73bf2-0467-41fe-bf47-3db03ea0503a/cable-chest-fly.png",
  "cable-crunch": "/__l5e/assets-v1/b3e6663a-4234-4030-bf85-cff40ce80d89/cable-crunch.png",
  "cable-curl": "/__l5e/assets-v1/f27c7939-fcbf-4f1b-87a0-9983dc3e993a/cable-curl.png",
  "cable-kickback": "/__l5e/assets-v1/2dbd6173-e8d4-4cad-a211-535583c8ae9c/cable-kickback.png",
  "cable-lateral-raise": "/__l5e/assets-v1/74652f8a-eb61-4df8-82c5-ed2c5e7eef50/cable-lateral-raise.png",
  "cable-triceps-pushdown": "/__l5e/assets-v1/4ed44750-1949-4535-bbf6-5002cec73656/cable-triceps-pushdown.png",
  "chest-supported-row": "/__l5e/assets-v1/fad8efc4-5be5-4830-ab8b-9abba6f8ba9b/chest-supported-row.png",
  "chin-up": "/__l5e/assets-v1/35f5a3f8-b5b3-4981-9d58-47477baa4e38/chin-up.png",
  "close-grip-bench-press": "/__l5e/assets-v1/337de94d-a13e-4920-b1da-0f2298214661/close-grip-bench-press.png",
  "conventional-deadlift": "/__l5e/assets-v1/8b0d9cc1-3868-49a1-9f92-d26aae7c0cb6/conventional-deadlift.png",
  "dip": "/__l5e/assets-v1/3dc814a1-940f-4b4f-a33a-0611cf659713/dip.png",
  "dumbbell-bench-press": "/__l5e/assets-v1/99b7ceb8-2b72-4841-bcad-c48ec654d141/dumbbell-bench-press.png",
};

export function exerciseImageUrl(name: string): string | undefined {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return EXERCISE_IMAGES[slug];
}
