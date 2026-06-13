import { afterEach, describe, expect, test, vi } from "vitest";
import {
  buildJobEventsUrl,
  createRefreshCoalescer,
  deliveredJobEventId
} from "../src/hooks/useJobEvents";

afterEach(() => {
  vi.useRealTimers();
});

describe("job event cursor", () => {
  test("adds the last delivered id to reconnect URLs", () => {
    expect(buildJobEventsUrl(null)).toBe("/api/events/jobs");
    expect(buildJobEventsUrl("42")).toBe("/api/events/jobs?after_id=42");
  });

  test("prefers MessageEvent.lastEventId and falls back to payload id", () => {
    expect(deliveredJobEventId("12", { id: 11 })).toBe("12");
    expect(deliveredJobEventId("", { id: 11 })).toBe("11");
    expect(deliveredJobEventId("", { id: "invalid" })).toBeNull();
  });
});

describe("refresh coalescing", () => {
  test("collapses an event burst into one refresh", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const coalescer = createRefreshCoalescer(refresh, 200);

    coalescer.schedule();
    coalescer.schedule();
    coalescer.schedule();

    await vi.advanceTimersByTimeAsync(199);
    expect(refresh).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    coalescer.dispose();
  });

  test("allows at most one follow-up after events during an in-flight refresh", async () => {
    vi.useFakeTimers();
    let finishFirstRefresh: (() => void) | undefined;
    const refresh = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        finishFirstRefresh = resolve;
      }))
      .mockResolvedValue(undefined);
    const coalescer = createRefreshCoalescer(refresh, 200);

    coalescer.schedule();
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(1);

    coalescer.schedule();
    coalescer.schedule();
    coalescer.schedule();
    await vi.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(1);

    finishFirstRefresh?.();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(2);
    coalescer.dispose();
  });
});
