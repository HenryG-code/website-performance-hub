import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Config for the live provider integration check.
 *
 * Separate from the default config so `npm test` never calls Google, spends
 * quota, or fails because a third party is having a bad day. Run explicitly:
 *
 *   npm run test:live
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    // Real Lighthouse runs are slow; give the whole file room.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Sequential: concurrent requests are the fastest way to hit a rate limit.
    fileParallelism: false,
    maxConcurrency: 1,
  },
});
