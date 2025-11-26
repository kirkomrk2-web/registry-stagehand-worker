// lib/RotationQueue.mjs
export class RotationQueue {
  constructor(items = []) {
    this.queue = Array.from(items);
  }
  push(item) {
    this.queue.push(item);
  }
  next() {
    if (this.queue.length === 0) return null;
    const item = this.queue.shift();
    // rotate FIFO: push used item to the end
    this.queue.push(item);
    return item;
  }
  length() {
    return this.queue.length;
  }
  isEmpty() {
    return this.queue.length === 0;
  }
  toArray() {
    return [...this.queue];
  }
}
