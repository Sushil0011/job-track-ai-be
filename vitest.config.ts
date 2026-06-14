import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
    testTimeout: 30000,
    env: {
      NODE_ENV: "test",
      FRONTEND_URL: "http://localhost:3000",
    },
  },
});
