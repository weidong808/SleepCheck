import type { BreathModeId } from "@/lib/storage";

export const BREATH_MODES: Record<
  BreathModeId,
  { name: string; phases: string[]; durs: number[] }
> = {
  calm: { name: "Calm", phases: ["Inhale", "Exhale"], durs: [5, 6] },
  box: {
    name: "Box",
    phases: ["Inhale", "Hold", "Exhale", "Hold"],
    durs: [4, 4, 4, 4],
  },
  release: {
    name: "Release",
    phases: ["Inhale", "Hold", "Exhale"],
    durs: [4, 2, 7],
  },
};
