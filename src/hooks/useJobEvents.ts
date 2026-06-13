import { useCallback, useEffect, useRef, useState } from "react";

const JOB_EVENTS_URL = "/api/events/jobs";

function normalizeEventId(value: unknown): string | null {
  const candidate = String(value ?? "");
  return /^\d+$/.test(candidate) ? candidate : null;
}

export function buildJobEventsUrl(lastDeliveredId: string | null): string {
  return lastDeliveredId
    ? `${JOB_EVENTS_URL}?after_id=${encodeURIComponent(lastDeliveredId)}`
    : JOB_EVENTS_URL;
}

export function deliveredJobEventId(
  lastEventId: string,
  payload: unknown
): string | null {
  const messageId = normalizeEventId(lastEventId);
  if (messageId) return messageId;
  if (!payload || typeof payload !== "object" || !("id" in payload)) return null;
  return normalizeEventId(payload.id);
}

export function createRefreshCoalescer(
  refresh: () => void | Promise<unknown>,
  delayMs = 200
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  let followUp = false;
  let disposed = false;

  const scheduleTimer = () => {
    if (disposed || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      void runRefresh();
    }, delayMs);
  };

  const runRefresh = async () => {
    if (disposed) return;
    inFlight = true;
    try {
      await refresh();
    } catch (error) {
      console.error(error);
    } finally {
      inFlight = false;
      if (!disposed && followUp) {
        followUp = false;
        scheduleTimer();
      }
    }
  };

  return {
    schedule() {
      if (disposed) return;
      if (inFlight) {
        followUp = true;
        return;
      }
      scheduleTimer();
    },
    dispose() {
      disposed = true;
      followUp = false;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    }
  };
}

export function useCoalescedRefresh(
  refresh: () => void | Promise<unknown>,
  delayMs = 200
) {
  const refreshRef = useRef(refresh);
  const coalescerRef = useRef<ReturnType<typeof createRefreshCoalescer> | null>(null);
  refreshRef.current = refresh;

  useEffect(() => {
    const coalescer = createRefreshCoalescer(
      () => refreshRef.current(),
      delayMs
    );
    coalescerRef.current = coalescer;

    return () => {
      coalescer.dispose();
      if (coalescerRef.current === coalescer) coalescerRef.current = null;
    };
  }, [delayMs]);

  return useCallback(() => {
    coalescerRef.current?.schedule();
  }, []);
}

export function useJobEvents() {
  const [lastEvent, setLastEvent] = useState<any>(null);
  const lastDeliveredIdRef = useRef<string | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 2000);
    };

    function connect() {
      if (disposed || source) return;
      const nextSource = new EventSource(
        buildJobEventsUrl(lastDeliveredIdRef.current)
      );
      source = nextSource;
      
      nextSource.onmessage = (e) => {
        if (disposed || source !== nextSource) return;
        const messageId = normalizeEventId(e.lastEventId);
        if (messageId) lastDeliveredIdRef.current = messageId;

        try {
          const data = JSON.parse(e.data);
          const deliveredId = deliveredJobEventId(e.lastEventId, data);
          if (deliveredId) lastDeliveredIdRef.current = deliveredId;
          setLastEvent({ eventType: e.type, data });
        } catch {
          // Ignore malformed rows without dropping the live connection.
        }
      };

      nextSource.onerror = () => {
        if (disposed || source !== nextSource) {
          nextSource.close();
          return;
        }
        source = null;
        nextSource.close();
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      disposed = true;
      source?.close();
      source = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };
  }, []);

  return lastEvent;
}
