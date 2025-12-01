import { describe, it, expect, vi, beforeEach } from "vitest";
import { englishTools, executeLocalTool, mathTools, transferTool, buildCustomApiTool } from "@/lib/tools";

describe("tool executors", () => {
  it("executes math tools", async () => {
    const add = mathTools.find((t) => t.id === "addition")!;
    const res = await executeLocalTool(add, { a: 2, b: 3 });
    expect(res.output).toBe("5");
  });

  it("handles division by zero with error", async () => {
    const div = mathTools.find((t) => t.id === "division")!;
    const res = await executeLocalTool(div, { a: 4, b: 0 });
    expect(res.error).toBeDefined();
  });

  it("executes english tools", async () => {
    const wordCount = englishTools.find((t) => t.id === "word_count")!;
    const res = await executeLocalTool(wordCount, { text: "hello world" });
    expect(res.output).toContain('"count":2');
  });

  describe("custom api tool", () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      fetchMock.mockReset();
      // @ts-expect-error override global fetch for tests
      global.fetch = fetchMock;
    });

    it("returns payload on success", async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
      const tool = buildCustomApiTool("api1", "api1", "https://example.com", "POST", {
        foo: { type: "string" },
      });
      const res = await executeLocalTool(tool, { payload: { foo: "bar" } });
      expect(res.output).toContain('"status":200');
    });

    it("appends query params for GET", async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
      const tool = buildCustomApiTool("api1", "api1", "https://example.com", "GET", {
        city: { type: "string" },
      });
      await executeLocalTool(tool, { payload: { city: "Paris" } });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("city=Paris"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("returns error on failure", async () => {
      fetchMock.mockRejectedValue(new Error("network down"));
      const tool = buildCustomApiTool("api1", "api1", "https://example.com", "POST", {
        foo: { type: "string" },
      });
      const res = await executeLocalTool(tool, { payload: { foo: "bar" } });
      expect(res.error).toBeDefined();
    });

    it("sanitizes custom api tool name", () => {
      const tool = buildCustomApiTool("api2", "Get Weather!", "https://example.com", "GET", {});
      expect(tool.name).toBe("Get_Weather");
      expect(tool.schema.name).toBe("Get_Weather");
    });
  });
});
