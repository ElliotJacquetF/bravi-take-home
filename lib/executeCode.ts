// Client-side helper to run JS snippets in a sandboxed worker with a timeout.

type WorkerResult = { ok: boolean; result?: string; error?: string };

let workerInstance: Worker | null = null;

function ensureWorker() {
  if (typeof Worker === "undefined") return null;
  if (workerInstance) return workerInstance;
  try {
    workerInstance = new Worker(new URL("./workers/executeCode.worker.ts", import.meta.url), {
      type: "module",
    });
    return workerInstance;
  } catch {
    return null;
  }
}

function stringifyResult(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? "undefined" : serialized;
  } catch {
    return String(value);
  }
}

async function runInFallback(code: string, timeoutMs: number): Promise<WorkerResult> {
  // Used when Worker is unavailable (e.g., tests/SSR); still sandbox-less, so keep minimal.
  try {
    const fn = new Function(code);
    const maybe = fn();
    if (maybe && typeof (maybe as Promise<unknown>).then === "function") {
      const res = await Promise.race([
        (maybe as Promise<unknown>),
        new Promise<"__timeout__">((resolve) => setTimeout(() => resolve("__timeout__"), timeoutMs)),
      ]);
      if (res === "__timeout__") {
        return { ok: false, error: "Execution timed out" };
      }
      return { ok: true, result: stringifyResult(res) };
    }
    return { ok: true, result: stringifyResult(maybe) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Execution failed" };
  }
}

export function executeCodeInWorker(code: string, timeoutMs = 2000): Promise<WorkerResult> {
  const worker = ensureWorker();
  if (!worker) {
    return runInFallback(code, timeoutMs);
  }

  return new Promise<WorkerResult>((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        worker.terminate();
      } catch {
        // ignore
      }
      workerInstance = null;
      resolve({ ok: false, error: "Execution timed out" });
    }, timeoutMs);

    const onMessage = (event: MessageEvent<WorkerResult>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      resolve(event.data);
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      resolve({ ok: false, error: "Execution failed" });
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError, { once: true });
    worker.postMessage({ code });
  });
}
