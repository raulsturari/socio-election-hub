import { describe, expect, it } from "vitest";
import { pearson } from "./stats";

describe("pearson", () => {
  it("perfect positive", () => expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1));
  it("perfect negative", () => expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1));
  it("too few points", () => expect(pearson([1, 2], [1, 2])).toBeNull());
  it("zero variance", () => expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull());
});
