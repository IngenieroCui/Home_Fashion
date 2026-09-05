/** Coalesce requests within one Next server process, including slightly delayed 401s. */
export function createRefreshCoordinator<T>(
  refresh: (token: string) => Promise<T>,
  isSuccess: (value: T) => boolean,
  graceMs = 3000
) {
  const pending = new Map<string, Promise<T>>();
  return (token: string, key: string): Promise<T> => {
    const existing = pending.get(key);
    if (existing) return existing;
    const task = Promise.resolve().then(() => refresh(token));
    pending.set(key, task);
    void task.then(
      (value) => {
        if (!isSuccess(value)) {
          pending.delete(key);
          return;
        }
        const timer = setTimeout(() => pending.delete(key), graceMs);
        timer.unref?.();
      },
      () => pending.delete(key)
    );
    return task;
  };
}
