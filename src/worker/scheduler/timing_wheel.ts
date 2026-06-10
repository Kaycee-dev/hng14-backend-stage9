import { effectivePriority } from "./aging";

export class TimingWheel {
  public slots: number;
  public tickSeconds: number;
  public buckets: any[][];
  public overflow: [number, any][];
  public current: number;

  constructor(slots = 60, tickSeconds = 1) {
    this.slots = slots;
    this.tickSeconds = tickSeconds;
    this.buckets = Array.from({ length: slots }, () => []);
    this.overflow = [];
    this.current = 0;
  }

  add(job: any, dueTs: number) {
    const delay = Math.max(0, dueTs - Date.now());
    if (delay >= this.slots * this.tickSeconds * 1000) {
      this.overflow.push([dueTs, job]);
    } else {
      const slot = (this.current + Math.floor(delay / 1000 / this.tickSeconds)) % this.slots;
      this.buckets[slot].push(job);
    }
  }

  advance(): any[] {
    const due = this.buckets[this.current];
    this.buckets[this.current] = [];
    this.current = (this.current + 1) % this.slots;

    if (this.current === 0) {
      const now = Date.now();
      const keep: [number, any][] = [];
      for (const [dueTs, job] of this.overflow) {
        if (dueTs - now < this.slots * this.tickSeconds * 1000) {
          this.add(job, dueTs);
        } else {
          keep.push([dueTs, job]);
        }
      }
      this.overflow = keep;
    }

    // Within-bucket order
    const nowD = new Date();
    return due.sort((a, b) => {
      const aEp = effectivePriority(a.priority, new Date(a.created_at), new Date(a.scheduled_at), nowD);
      const bEp = effectivePriority(b.priority, new Date(b.created_at), new Date(b.scheduled_at), nowD);
      return aEp - bEp;
    });
  }
}
