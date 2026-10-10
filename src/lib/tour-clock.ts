/**
 * Explore tour clock — pure, framework-free, testable with fake timers.
 * Rules: time counts only while playing AND the current analysis (identified by a full key)
 * reported ready; any key change invalidates readiness; one timer at most; advance is atomic.
 */
export const TOUR_SPEEDS = [5, 10, 15, 30, 60] as const;
export type TourSpeed = (typeof TOUR_SPEEDS)[number];
export const DEFAULT_TOUR_SPEED: TourSpeed = 15;
export const TOUR_SPEED_STORAGE_KEY = "bdl.explore.tourSpeed";

export function parseTourSpeed(raw: unknown): TourSpeed {
  const n = typeof raw === "string" ? Number(raw) : raw;
  return (TOUR_SPEEDS as readonly unknown[]).includes(n) ? (n as TourSpeed) : DEFAULT_TOUR_SPEED;
}

export interface TourTimers {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export class TourClock {
  private key: string | null = null;
  private ready = false;
  private playing = false;
  private durationMs: number;
  private startedAt: number | null = null;
  private handle: unknown = null;
  private generation = 0;

  constructor(private readonly timers: TourTimers, private readonly onAdvance: () => void, speed: TourSpeed = DEFAULT_TOUR_SPEED) {
    this.durationMs = speed * 1000;
  }

  /** The analysis on screen changed (preset, filters, mode, X…): stop counting until it is ready. */
  setKey(key: string) {
    if (key === this.key) return;
    this.key = key; this.ready = false; this.stop();
  }

  /** Ignored unless it refers to the analysis currently on screen (stale callbacks are dropped). */
  markReady(key: string) {
    if (key !== this.key || this.ready) return;
    this.ready = true; this.restart();
  }

  markNotReady(key: string) {
    if (key !== this.key || !this.ready) return;
    this.ready = false; this.stop();
  }

  setPlaying(playing: boolean) {
    this.playing = playing; this.restart();
  }

  setSpeed(speed: TourSpeed) {
    this.durationMs = speed * 1000; this.restart();
  }

  isPlaying() { return this.playing; }
  isReady() { return this.ready; }
  durationSeconds() { return this.durationMs / 1000; }

  /** 0–1 of real elapsed display time since the current analysis became ready. */
  progress(): number {
    if (this.startedAt == null) return 0;
    return Math.min(1, Math.max(0, (this.timers.now() - this.startedAt) / this.durationMs));
  }

  dispose() { this.stop(); this.playing = false; }

  private stop() {
    if (this.handle != null) this.timers.clearTimeout(this.handle);
    this.handle = null; this.startedAt = null; this.generation++;
  }

  private restart() {
    this.stop();
    if (!this.playing || !this.ready) return;
    const gen = this.generation;
    this.startedAt = this.timers.now();
    this.handle = this.timers.setTimeout(() => {
      if (gen !== this.generation) return;
      this.handle = null; this.startedAt = null; this.ready = false; this.generation++;
      this.onAdvance();
    }, this.durationMs);
  }
}
