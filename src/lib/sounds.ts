export type SoundDef = {
  id: string;
  label: string;
  desc: string;
  type: "rain" | "ocean" | "brown" | "pink" | "white" | "binaural";
  vol: number;
  icon: string;
};

export const SOUNDS: SoundDef[] = [
  {
    id: "rain",
    label: "Soft Rain",
    desc: "Layered rainfall on leaves",
    type: "rain",
    vol: 0.42,
    icon: "Rain",
  },
  {
    id: "ocean",
    label: "Low Tide",
    desc: "Slow shoreline waves",
    type: "ocean",
    vol: 0.45,
    icon: "Ocean",
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
