import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCustomApiTool, executeLocalTool } from "@/lib/tools";

describe("Custom API executor", () => {
  const fetchMock = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    // @ts-expect-error override fetch for tests
    global.fetch = fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error restore fetch
    global.fetch = originalFetch;
  });

  it("handles successful GET with query params", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    const tool = buildCustomApiTool("custom-1", "get_weather", "https://api.test/weather", "GET", {
      city: { type: "string" },
    });
    const result = await executeLocalTool(tool, { payload: { city: "Paris" } });
    expect(fetchMock).toHaveBeenCalled();
    expect(result.output).toContain("\"status\":200");
  });

  it("handles network error gracefully", async () => {
    fetchMock.mockRejectedValue(new Error("fail"));
    const tool = buildCustomApiTool("custom-2", "get_weather", "https://api.test/weather", "POST", {
      city: { type: "string" },
    });
    const result = await executeLocalTool(tool, { payload: { city: "Paris" } });
    expect(result.error).toBeDefined();
  });
});
