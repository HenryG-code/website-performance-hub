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
    // Live provider checks have their own config and are run deliberately via
    // `npm run test:live`; they cost quota and depend on a third party.
    exclude: ["**/node_modules/**", "src/**/*.integration.test.ts"],
    restoreMocks: true,
  },
});
