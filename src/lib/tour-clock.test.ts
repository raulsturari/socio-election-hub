import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TourClock, parseTourSpeed, DEFAULT_TOUR_SPEED, type TourSpeed } from "./tour-clock";

function make(speed: TourSpeed = 15) {
  const onAdvance = vi.fn();
  const clock = new TourClock({ now: () => Date.now(), setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) }, onAdvance, speed);
  return { clock, onAdvance };
}

describe("TourClock", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it.each([5, 15, 60] as const)("advances exactly once after %ss of ready display", (s) => {
    const { clock, onAdvance } = make(s);
    clock.setKey("a"); clock.setPlaying(true); clock.markReady("a");
    vi.advanceTimersByTime(s * 1000 - 1); expect(onAdvance).not.toHaveBeenCalled();
    expect(clock.progress()).toBeGreaterThan(0.99);
    vi.advanceTimersByTime(1); expect(onAdvance).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(s * 5000); expect(onAdvance).toHaveBeenCalledTimes(1); // waits for next ready
  });

  it("never counts while loading, however long it takes", () => {
    const { clock, onAdvance } = make(5);
    clock.setKey("a"); clock.setPlaying(true);
    vi.advanceTimersByTime(120_000);
    expect(onAdvance).not.toHaveBeenCalled(); expect(clock.progress()).toBe(0);
    clock.markReady("a"); vi.advanceTimersByTime(4999); expect(onAdvance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("stays put on partial readiness (primary ready, Lula/mesh/canvas pending → not ready)", () => {
    const { clock, onAdvance } = make(5);
    clock.setKey("a"); clock.setPlaying(true);
    clock.markNotReady("a"); vi.advanceTimersByTime(30_000);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("ignores stale ready callbacks from a previous analysis", () => {
    const { clock, onAdvance } = make(5);
    clock.setKey("a"); clock.setPlaying(true); clock.setKey("b");
    clock.markReady("a"); vi.advanceTimersByTime(60_000);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("filter/mode change mid-count invalidates and restarts from zero", () => {
    const { clock, onAdvance } = make(5);
    clock.setKey("a"); clock.setPlaying(true); clock.markReady("a");
    vi.advanceTimersByTime(4000); clock.setKey("a2"); expect(clock.progress()).toBe(0);
    vi.advanceTimersByTime(10_000); expect(onAdvance).not.toHaveBeenCalled();
    clock.markReady("a2"); vi.advanceTimersByTime(4999); expect(onAdvance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("pause stops; play resumes with a full window", () => {
    const { clock, onAdvance } = make(5);
    clock.setKey("a"); clock.setPlaying(true); clock.markReady("a");
    vi.advanceTimersByTime(4000); clock.setPlaying(false);
    vi.advanceTimersByTime(60_000); expect(onAdvance).not.toHaveBeenCalled(); expect(clock.progress()).toBe(0);
    clock.setPlaying(true); vi.advanceTimersByTime(4999); expect(onAdvance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("speed change restarts the count without advancing immediately", () => {
    const { clock, onAdvance } = make(5);
    clock.setKey("a"); clock.setPlaying(true); clock.markReady("a");
    vi.advanceTimersByTime(4900); clock.setSpeed(10);
    expect(onAdvance).not.toHaveBeenCalled(); expect(clock.progress()).toBe(0);
    vi.advanceTimersByTime(9999); expect(onAdvance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("error/empty (not ready) after ready stops the timer; dispose leaves no timer", () => {
    const { clock, onAdvance } = make(5);
    clock.setKey("a"); clock.setPlaying(true); clock.markReady("a");
    clock.markNotReady("a"); vi.advanceTimersByTime(20_000); expect(onAdvance).not.toHaveBeenCalled();
    clock.markReady("a"); clock.dispose(); vi.advanceTimersByTime(20_000);
    expect(onAdvance).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a single timer under repeated ready/play calls", () => {
    const { clock } = make(5);
    clock.setKey("a"); clock.setPlaying(true); clock.markReady("a"); clock.markReady("a"); clock.setPlaying(true);
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe("parseTourSpeed", () => {
  it("accepts only offered values and falls back to 15", () => {
    expect(parseTourSpeed("30")).toBe(30);
    expect(parseTourSpeed(60)).toBe(60);
    expect(parseTourSpeed("7")).toBe(DEFAULT_TOUR_SPEED);
    expect(parseTourSpeed(null)).toBe(15);
    expect(parseTourSpeed("abc")).toBe(15);
  });
});
