export class Semaphore {
  #active = 0;
  #queue = [];
  constructor(limit) { this.limit = limit; }
  async run(task) {
    if (this.#active >= this.limit) await new Promise(resolve => this.#queue.push(resolve));
    this.#active += 1;
    try { return await task(); }
    finally {
      this.#active -= 1;
      this.#queue.shift()?.();
    }
  }
}
