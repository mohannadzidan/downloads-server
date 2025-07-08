import { vi } from "vitest";

vi.mock("./src/utils/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
