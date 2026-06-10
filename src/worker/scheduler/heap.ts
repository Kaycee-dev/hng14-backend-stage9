export class MinHeap<T> {
  private heap: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  push(val: T) {
    this.heap.push(val);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0 && bottom !== undefined) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  get length(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number) {
    const val = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (this.compare(val, parent) >= 0) break;
      this.heap[index] = parent;
      index = parentIdx;
    }
    this.heap[index] = val;
  }

  private sinkDown(index: number) {
    const length = this.heap.length;
    const val = this.heap[index];
    while (true) {
      const leftIdx = 2 * index + 1;
      const rightIdx = 2 * index + 2;
      let left: T | undefined, right: T | undefined;
      let swapIdx: number | null = null;

      if (leftIdx < length) {
        left = this.heap[leftIdx];
        if (this.compare(left, val) < 0) {
          swapIdx = leftIdx;
        }
      }

      if (rightIdx < length) {
        right = this.heap[rightIdx];
        if (
          (swapIdx === null && this.compare(right, val) < 0) ||
          (swapIdx !== null && left !== undefined && this.compare(right, left) < 0)
        ) {
          swapIdx = rightIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[index] = this.heap[swapIdx];
      index = swapIdx;
    }
    this.heap[index] = val;
  }
}
