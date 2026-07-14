import type { SynthType } from "@/lib/audioEngine";

export type SoundDef = {
  id: string;
  label: string;
  desc: string;
  type: SynthType;
  /** Rendered high-quality loop; falls back to live synthesis if missing. */
  src?: string;
  vol: number;
  icon: string;
};

export const SOUNDS: SoundDef[] = [
  {
    id: "rain",
    label: "Soft Rain",
    desc: "Rainfall on leaves, distant wash",
    type: "rain",
    src: "/audio/rain.mp3",
    vol: 0.5,
    icon: "Rain",
  },
  {
    id: "ocean",
    label: "Low Tide",
    desc: "Slow waves arriving and receding",
    type: "ocean",
    src: "/audio/ocean.mp3",
    vol: 0.55,
    icon: "Ocean",
  },
  {
    id: "fire",
    label: "Fireplace",
    desc: "Low embers and soft crackle",
    type: "fire",
    src: "/audio/fire.mp3",
    vol: 0.5,
    icon: "Fire",
  },
  {
    id: "wind",
    label: "Night Wind",
    desc: "Slow gusts through trees",
    type: "wind",
    src: "/audio/wind.mp3",
    vol: 0.45,
    icon: "Wind",
  },
  {
    id: "stream",
    label: "Creek",
    desc: "Water over smooth stones",
    type: "stream",
    src: "/audio/stream.mp3",
    vol: 0.45,
    icon: "Stream",
  },
  {
    id: "crickets",
    label: "Summer Night",
    desc: "Distant crickets in a meadow",
    type: "crickets",
    src: "/audio/crickets.mp3",
    vol: 0.4,
    icon: "Cricket",
  },
  {
    id: "brown",
    label: "Brown Noise",
    desc: "Warm steady blanket",
    type: "brown",
    vol: 0.32,
    icon: "Brown",
  },
  {
    id: "pink",
    label: "Pink Noise",
    desc: "Balanced and smooth",
    type: "pink",
    vol: 0.28,
    icon: "Pink",
  },
  {
    id: "white",
    label: "White Noise",
    desc: "Clean sound mask",
    type: "white",
    vol: 0.24,
    icon: "White",
  },
  {
    id: "theta",
    label: "Theta Drift",
    desc: "Gentle binaural tone",
    type: "binaural",
    vol: 0.18,
    icon: "Tone",
  },
];

export const SAMPLE_SRCS = SOUNDS.filter((s) => s.src).map((s) => s.src!);
