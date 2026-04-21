export type PoolSuccess<O> = { ok: true; value: O };
export type PoolFailure<I> = { ok: false; error: unknown; item: I };
export type PoolEntry<I, O> = PoolSuccess<O> | PoolFailure<I>;

export async function pool<I, O>(
  items: I[],
  limit: number,
  fn: (item: I) => Promise<O>,
  onProgress?: (done: number, total: number) => void,
): Promise<PoolEntry<I, O>[]> {
  const out: PoolEntry<I, O>[] = new Array(items.length);
  let next = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        out[i] = { ok: true, value: await fn(items[i]) };
      } catch (error) {
        out[i] = { ok: false, error, item: items[i] };
      }
      done++;
      onProgress?.(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
