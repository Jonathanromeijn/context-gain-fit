import { exerciseImageUrl } from "@/lib/exercise-images";
import { cn } from "@/lib/utils";

/**
 * Small anatomy illustration for a built-in exercise: grayscale figure
 * performing the movement with the working muscles highlighted in red.
 * Renders nothing for custom exercises without an illustration.
 */
export function ExerciseImage({ name, className }: { name: string; className?: string }) {
  const url = exerciseImageUrl(name);
  if (!url) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white",
        className,
      )}
    >
      <img
        src={url}
        alt={`${name} — highlighted muscles`}
        loading="lazy"
        className="size-full object-cover"
      />
    </span>
  );
}
