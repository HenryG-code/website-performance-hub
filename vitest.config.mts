import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` exists only inside Next's bundler graph.
      "server-only": fileURLToPath(
        new URL("./test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    // Node environment: everything under test is pure logic or server code.
    // Component tests would need jsdom, which is deliberately not pulled in yet.
    environment: "node",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
