import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
vi.stubEnv("DATABASE_URL", "file:./prisma/test.db");
vi.stubEnv("NEXTAUTH_SECRET", "test-secret-key-for-testing-only");
vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");

// Global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testUtils: {
    mockFetch: (response: unknown) => void;
    resetMocks: () => void;
  };
}

globalThis.testUtils = {
  mockFetch: (response: unknown) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => response,
    });
  },
  resetMocks: () => {
    vi.clearAllMocks();
  },
};

export { expect, vi };
