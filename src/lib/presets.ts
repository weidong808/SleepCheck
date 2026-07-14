import { SOUNDS } from "@/lib/sounds";

export type Preset = {
  id: string;
  name: string;
  desc: string;
  mix: Record<string, number>; // soundId -> volume
};

export const PRESETS: Preset[] = [
  {
    id: "rainy-cabin",
    name: "Rainy Cabin",
    desc: "Rain on the roof, fire in the hearth",
    mix: { rain: 0.4, fire: 0.34 },
  },
  {
    id: "moonlit-shore",
    name: "Moonlit Shore",
    desc: "Slow waves and a soft night wind",
    mix: { ocean: 0.44, wind: 0.22 },
  },
  {
    id: "summer-meadow",
    name: "Summer Meadow",
    desc: "Crickets, breeze, and a far-off creek",
    mix: { crickets: 0.26, wind: 0.2, stream: 0.18 },
  },
  {
    id: "deep-hush",
    name: "Deep Hush",
    desc: "Brown noise with a theta drift",
    mix: { brown: 0.34, theta: 0.14 },
  },
  {
    id: "storm-shelter",
    name: "Storm Shelter",
    desc: "Heavy rain, wind, and warm cover",
    mix: { rain: 0.48, wind: 0.3, brown: 0.18 },
  },
];

const knownIds = new Set(SOUNDS.map((s) => s.id));

/** "rain:0.40,fire:0.34" — compact, human-readable, URL-safe. */
export function encodeMix(mix: Record<string, number>): string {
  return Object.entries(mix)
    .filter(([id, v]) => knownIds.has(id) && v > 0)
    .map(([id, v]) => `${id}:${Math.min(0.8, Math.max(0, v)).toFixed(2)}`)
    .join(",");
}

export function decodeMix(raw: string): Record<string, number> | null {
  const mix: Record<string, number> = {};
  for (const part of raw.split(",")) {
    const [id, volStr] = part.split(":");
    if (!id || !knownIds.has(id)) continue;
    const vol = parseFloat(volStr);
    if (!Number.isFinite(vol)) continue;
    mix[id] = Math.min(0.8, Math.max(0.02, vol));
  }
  return Object.keys(mix).length ? mix : null;
}

export function mixLabel(mix: Record<string, number>): string {
  return SOUNDS.filter((s) => mix[s.id] != null)
    .map((s) => s.label)
    .join(" + ");
}

export function buildShareUrl(mix: Record<string, number>): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("mix", encodeMix(mix));
  return url.toString();
}
