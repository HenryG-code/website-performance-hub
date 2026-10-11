import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
import { describe, expect, it, vi } from "vitest";
import { checkTarget } from "../../../supabase/functions/_shared/http-probe";

function transport(statusCode = 200) {
  const destroy = vi.fn();
  const request = vi.fn((_options: RequestOptions, callback: (response: IncomingMessage) => void) => {
    const req = new EventEmitter() as ClientRequest;
    req.end = vi.fn(() => {
      callback({ statusCode, destroy } as unknown as IncomingMessage);
      return req;
    });
    return req;
  });
  return { request, destroy };
}

const monitor = { target_url: "https://public.example.com/path?check=1", timeout_ms: 5000 };
const publicDns = () => Promise.resolve([{ address: "93.184.215.14", family: 4 }]);

describe("uptime worker URL validation", () => {
  it.each([
    "http://127.1", "http://2130706433", "http://0x7f000001", "http://169.254.169.254/latest/meta-data/",
    "http://192.168.1.1", "http://10.0.0.1", "http://[::ffff:7f00:1]", "http://localhost.",
    "https://public.example.com:8080", "https://user:password@public.example.com", "file:///etc/passwd",
  ])("blocks a changed or directly stored unsafe target %s before networking", async (target_url) => {
    const resolve = vi.fn(publicDns);
    const { request } = transport();
    const result = await checkTarget({ ...monitor, target_url }, { resolve, request });
    expect(result.error).toBe("Unsafe monitor URL.");
    expect(resolve).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "::ffff:a00:1", "64:ff9b::a00:1", "2002:a00:1::"])(
    "blocks public hostnames resolving to %s", async (address) => {
      const { request } = transport();
      const resolve = async () => [{ address, family: address.includes(":") ? 6 : 4 }];
      expect((await checkTarget(monitor, { resolve, request })).error).toBe("Unsafe monitor URL.");
      expect(request).not.toHaveBeenCalled();
    },
  );

  it("rejects mixed public/private DNS answers", async () => {
    const { request } = transport();
    const resolve = async () => [...await publicDns(), { address: "192.168.1.1", family: 4 }];
    expect((await checkTarget(monitor, { resolve, request })).error).toBe("Unsafe monitor URL.");
    expect(request).not.toHaveBeenCalled();
  });

  it("pins a validated IP while retaining Host and TLS SNI", async () => {
    const { request, destroy } = transport();
    const resolve = vi.fn(publicDns);
    const result = await checkTarget(monitor, { resolve, request });
    expect(result.statusCode).toBe(200);
    expect(result.error).toBeNull();
    expect(resolve).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][0]).toMatchObject({
      protocol: "https:", hostname: "93.184.215.14", family: 4, servername: "public.example.com",
      path: "/path?check=1", port: 443, headers: { Host: "public.example.com" }, agent: false,
    });
    expect(request.mock.calls[0][0].rejectUnauthorized).not.toBe(false);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("reports redirect status without following it", async () => {
    const { request } = transport(302);
    expect((await checkTarget(monitor, { resolve: publicDns, request })).statusCode).toBe(302);
    expect(request).toHaveBeenCalledOnce();
  });

  it("fails closed on empty or failed DNS, without disclosing details", async () => {
    const { request } = transport();
    expect((await checkTarget(monitor, { resolve: async () => [], request })).error).toBe("Unsafe monitor URL.");
    const result = await checkTarget(monitor, { resolve: async () => { throw new Error("sensitive detail"); }, request });
    expect(result.error).toBe("Network request failed.");
    expect(request).not.toHaveBeenCalled();
  });

  it("caps stalled DNS resolution with the probe timeout", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const { request } = transport();
    const pending = checkTarget({ ...monitor, timeout_ms: 1 }, { resolve: () => new Promise(() => {}), request });
    controller.abort(new Error("timeout"));
    expect((await pending).error).toBe("Request timed out.");
    expect(timeout).toHaveBeenCalledWith(1000);
    expect(request).not.toHaveBeenCalled();
  });
});
