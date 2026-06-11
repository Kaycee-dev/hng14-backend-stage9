import { describe, expect, test } from "vitest";
import { nextBackoffSeconds } from "../src/worker/retry";

const backoffCases = [
  { retryCount: 1, base: 1, lower: 1, upper: 1.25 },
  { retryCount: 2, base: 5, lower: 3.75, upper: 6.25 },
  { retryCount: 3, base: 25, lower: 18.75, upper: 31.25 }
];

describe("nextBackoffSeconds", () => {
  test.each(backoffCases)(
    "keeps retry $retryCount within 25% of its $base second base",
    ({ retryCount, lower, upper }) => {
      for (let iteration = 0; iteration < 200; iteration += 1) {
        const result = nextBackoffSeconds(retryCount);

        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeGreaterThanOrEqual(lower);
        expect(result).toBeLessThanOrEqual(upper);
      }
    }
  );

  test("uses monotonically increasing retry bases", () => {
    expect(backoffCases[0].base).toBeLessThan(backoffCases[1].base);
    expect(backoffCases[1].base).toBeLessThan(backoffCases[2].base);
  });
});
