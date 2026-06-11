import { describe, expect, test } from "vitest";
import { effectivePriority } from "../src/worker/scheduler/aging";

const now = new Date("2026-06-11T12:00:00.000Z");

function eligibleAtAge(ageSeconds: number): Date {
  return new Date(now.getTime() - ageSeconds * 1000);
}

describe("effectivePriority", () => {
  test.each([
    { basePriority: 3, ageSeconds: 0, expected: 3 },
    { basePriority: 3, ageSeconds: 299, expected: 3 },
    { basePriority: 3, ageSeconds: 300, expected: 2 },
    { basePriority: 3, ageSeconds: 599, expected: 2 },
    { basePriority: 3, ageSeconds: 600, expected: 1 },
    { basePriority: 2, ageSeconds: 0, expected: 2 },
    { basePriority: 2, ageSeconds: 299, expected: 2 },
    { basePriority: 2, ageSeconds: 300, expected: 1 },
    { basePriority: 2, ageSeconds: 599, expected: 1 },
    { basePriority: 2, ageSeconds: 600, expected: 1 }
  ])(
    "maps base $basePriority at age $ageSeconds seconds to $expected",
    ({ basePriority, ageSeconds, expected }) => {
      const eligibleAt = eligibleAtAge(ageSeconds);

      expect(
        effectivePriority(basePriority, eligibleAt, eligibleAt, now)
      ).toBe(expected);
    }
  );

  test.each([0, 299, 300, 599, 600, 86_400])(
    "never boosts base priority 1 at age %i seconds",
    (ageSeconds) => {
      const eligibleAt = eligibleAtAge(ageSeconds);

      expect(effectivePriority(1, eligibleAt, eligibleAt, now)).toBe(1);
    }
  );

  test("starts aging at the later of creation and scheduling", () => {
    const createdAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const scheduledAt = new Date(now);

    expect(effectivePriority(3, createdAt, scheduledAt, now)).toBe(3);
  });
});
