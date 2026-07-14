const KEY = "sleepcheck.nights.v1";

type NightsData = { version: 1; nights: string[] };

/**
 * A "night" belongs to the previous calendar day until 5am,
 * so a 1:30am wind-down still counts for that evening.
 */
export function nightKey(d: Date = new Date()): string {
  const t = new Date(d);
  if (t.getHours() < 5) t.setDate(t.getDate() - 1);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function load(): NightsData {
  if (typeof window === "undefined") return { version: 1, nights: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, nights: [] };
    const parsed = JSON.parse(raw) as Partial<NightsData>;
    return { version: 1, nights: Array.isArray(parsed.nights) ? parsed.nights : [] };
  } catch {
    return { version: 1, nights: [] };
  }
}

/** Record tonight as a wind-down night. Returns updated stats. */
export function recordNight(): StreakStats {
  const data = load();
  const key = nightKey();
  if (!data.nights.includes(key)) {
    data.nights.push(key);
    data.nights.sort();
    if (data.nights.length > 730) data.nights = data.nights.slice(-730);
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // quota / private mode — stats just won't persist
    }
  }
  return getStreakStats();
}

export type StreakStats = {
  current: number;
  best: number;
  total: number;
  tonightDone: boolean;
};

function prevKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() - 1);
  return nightKey(new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12));
}

export function getStreakStats(): StreakStats {
  const { nights } = load();
  const set = new Set(nights);
  const tonight = nightKey();
  const tonightDone = set.has(tonight);

  // Current streak: count back from tonight (or last night if tonight not yet logged).
  let cursor = tonightDone ? tonight : prevKey(tonight);
  let current = tonightDone ? 1 : 0;
  if (tonightDone || set.has(cursor)) {
    if (!tonightDone) current = 1;
    while (set.has(prevKey(cursor))) {
      cursor = prevKey(cursor);
      current += 1;
    }
  }

  // Best streak: scan sorted nights.
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const n of nights) {
    run = prev !== null && prevKey(n) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }

  return { current, best, total: nights.length, tonightDone };
}
