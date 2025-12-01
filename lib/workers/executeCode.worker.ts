// This worker executes small JS snippets and returns a structured result.

self.onmessage = async (event: MessageEvent<{ code: string }>) => {
  const { code } = event.data || { code: "" };
  const toStr = (val: unknown): string => {
    if (val === undefined) return "undefined";
    try {
      const json = JSON.stringify(val);
      return json === undefined ? "undefined" : json;
    } catch {
      return String(val);
    }
  };
  try {
    const fn = new Function(code);
    const maybe = fn();
    if (maybe && typeof (maybe as Promise<unknown>).then === "function") {
      try {
        const awaited = await (maybe as Promise<unknown>);
        (self as any).postMessage({ ok: true, result: toStr(awaited) });
        return;
      } catch (err) {
        (self as any).postMessage({ ok: false, error: err instanceof Error ? err.message : "Execution failed" });
        return;
      }
    }
    (self as any).postMessage({ ok: true, result: toStr(maybe) });
  } catch (err) {
    (self as any).postMessage({ ok: false, error: err instanceof Error ? err.message : "Execution failed" });
  }
};
