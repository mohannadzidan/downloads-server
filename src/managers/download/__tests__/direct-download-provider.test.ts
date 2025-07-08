import * as fs from "node:fs";
import { Readable, Writable } from "node:stream";
import axios from "axios";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { DirectDownloadProvider } from "../direct-download-provider.js";

vi.mock("axios");
vi.mock("fs");
vi.mock("path", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    join: vi.fn((...args) => args.join("/")),
    basename: vi.fn((p) => p.split("/").pop() || ""),
  };
});

describe("DirectDownloadProvider", () => {
  let provider: DirectDownloadProvider;
  const mockAxios = axios as unknown as Mock;
  const onStart = vi.fn();
  const onProgress = vi.fn();
  const onComplete = vi.fn();
  const onError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new DirectDownloadProvider();
  });

  it("should start a download and call onComplete when finished", async () => {
    const mockResponseStream = new Readable({ read() {} });
    const mockWriteStream = new Writable({
      write(_chunk, _enc, cb) {
        cb();
      },
    });
    vi.spyOn(fs, "createWriteStream").mockReturnValue(
      mockWriteStream as unknown as fs.WriteStream,
    );

    mockAxios.mockResolvedValue({
      data: mockResponseStream,
      headers: { "content-length": "1000" },
    });

    await provider.start(
      "http://example.com/file.txt",
      "/downloads",
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    mockResponseStream.emit("end");

    expect(onComplete).toHaveBeenCalledWith();
    expect(onError).not.toHaveBeenCalled();
  });

  it("should call onError when axios fails", async () => {
    const error = new Error("Network error");

    mockAxios.mockRejectedValue(error);

    await provider.start(
      "http://example.com/file.txt",
      "/downloads",
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    expect(onError).toHaveBeenCalledWith(error);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("should not call onError for cancellation", async () => {
    const error = new Error("Cancelled");
    (axios.isCancel as unknown as Mock).mockReturnValue(true);
    mockAxios.mockRejectedValue(error);

    await provider.start(
      "http://example.com/file.txt",
      "/downloads",
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    expect(onError).not.toHaveBeenCalled();
  });

  it("should call onError when write stream fails", async () => {
    const writeError = new Error("Disk full");

    const mockResponseStream = new Readable({ read() {} });
    const mockWriteStream = new Writable({
      write(_chunk, _enc, cb) {
        cb();
      },
    });
    vi.spyOn(fs, "createWriteStream").mockReturnValue(
      mockWriteStream as unknown as fs.WriteStream,
    );

    mockAxios.mockResolvedValue({
      data: mockResponseStream,
      headers: { "content-length": "1000" },
    });

    await provider.start(
      "http://example.com/file.txt",
      "/downloads",
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    mockWriteStream.emit("error", writeError);

    expect(onError).toHaveBeenCalledWith(writeError);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("should get estimated size", async () => {
    (axios.head as Mock).mockResolvedValue({
      headers: { "content-length": "12345" },
    });

    const size = await provider.getEstimatedSize("http://example.com/file.txt");

    expect(size).toBe(12345);
    expect(axios.head).toHaveBeenCalledWith("http://example.com/file.txt");
  });

  it("should return 0 for estimated size when content-length is missing", async () => {
    (axios.head as Mock).mockResolvedValue({
      headers: {},
    });

    const size = await provider.getEstimatedSize("http://example.com/file.txt");

    expect(size).toBe(0);
  });

  it("should throw an error when getting estimated size fails", async () => {
    const error = new Error("HEAD request failed");
    (axios.head as Mock).mockRejectedValue(error);

    await expect(
      provider.getEstimatedSize("http://example.com/file.txt"),
    ).rejects.toThrow(error);
  });
});
