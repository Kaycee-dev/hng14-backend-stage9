import { useEffect, useState } from "react";

export function useJobEvents() {
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: any = null;

    function connect() {
      source = new EventSource('/api/events/jobs');
      
      source.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setLastEvent({ eventType: e.type, data });
        } catch (err) { }
      };

      source.onerror = () => {
        if (source) source.close();
        reconnectTimer = setTimeout(connect, 2000);
      };
    }

    connect();

    return () => {
      if (source) source.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  return lastEvent;
}
