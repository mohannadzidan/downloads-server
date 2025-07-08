import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import {
  checkDiskSpace,
  ensureDirectoryExists,
  fileExists,
  getDirectorySize,
  getFileSize,
} from "../file-system.ts";

vi.mock("fs/promises");

describe("fileSystem utilities", () => {
  const mockPath = "/test/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ensureDirectoryExists", () => {
    it("should create a directory if it does not exist", async () => {
      (fs.mkdir as Mock).mockResolvedValue(undefined);
      await ensureDirectoryExists(mockPath);
      expect(fs.mkdir).toHaveBeenCalledWith(mockPath, { recursive: true });
    });

    it("should throw an error if directory creation fails", async () => {
      const mockError = new Error("Failed to create");
      (fs.mkdir as Mock).mockRejectedValue(mockError);
      await expect(ensureDirectoryExists(mockPath)).rejects.toThrow(
        "Failed to create",
      );
    });
  });

  describe("fileExists", () => {
    it("should return true if file exists", async () => {
      (fs.access as Mock).mockResolvedValue(undefined);
      await expect(fileExists(mockPath)).resolves.toBe(true);
      expect(fs.access).toHaveBeenCalledWith(mockPath, fs.constants.F_OK);
    });

    it("should return false if file does not exist", async () => {
      (fs.access as Mock).mockRejectedValue(new Error("File not found"));
      await expect(fileExists(mockPath)).resolves.toBe(false);
    });
  });

  describe("getFileSize", () => {
    it("should return the size of the file", async () => {
      const mockStats = { size: 12345 };
      (fs.stat as Mock).mockResolvedValue(mockStats);
      await expect(getFileSize(mockPath)).resolves.toBe(12345);
      expect(fs.stat).toHaveBeenCalledWith(mockPath);
    });

    it("should throw an error if getting file size fails", async () => {
      const mockError = new Error("Failed to stat");
      (fs.stat as Mock).mockRejectedValue(mockError);
      await expect(getFileSize(mockPath)).rejects.toThrow("Failed to stat");
    });
  });

  describe("checkDiskSpace", () => {
    beforeEach(() => {
      (fs.mkdir as Mock).mockResolvedValue(undefined);
    });

    it("should return disk space using fs.statfs", async () => {
      (fs.statfs as Mock).mockResolvedValue({
        bfree: 100000, // Free blocks
        bsize: 4096, // Block size
        blocks: 200000, // Total blocks
      });

      const result = await checkDiskSpace(mockPath);
      expect(result).toEqual({
        free: 100000 * 4096,
        size: 200000 * 4096,
      });
      expect(fs.mkdir).toHaveBeenCalledWith(mockPath, { recursive: true });
      expect(fs.statfs).toHaveBeenCalledWith(mockPath);
    });

    it("should throw an error if fs.statfs fails", async () => {
      const mockError = new Error("statfs failed");
      (fs.statfs as Mock).mockRejectedValue(mockError);

      await expect(checkDiskSpace(mockPath)).rejects.toThrow("statfs failed");
    });
  });

  describe("getDirectorySize", () => {
    it("should return 0 for an empty directory", async () => {
      (fs.readdir as Mock).mockResolvedValue([]);
      const size = await getDirectorySize(mockPath);
      expect(size).toBe(0);
      expect(fs.readdir).toHaveBeenCalledWith(mockPath, {
        withFileTypes: true,
      });
    });

    it("should return the correct size for a directory with files", async () => {
      (fs.readdir as Mock).mockResolvedValue([
        { name: "file1.txt", isDirectory: () => false },
        { name: "file2.txt", isDirectory: () => false },
      ]);
      (fs.stat as Mock)
        .mockResolvedValueOnce({ size: 100 })
        .mockResolvedValueOnce({ size: 200 });

      const size = await getDirectorySize(mockPath);
      expect(size).toBe(300);
      expect(fs.readdir).toHaveBeenCalledWith(mockPath, {
        withFileTypes: true,
      });
      expect(fs.stat).toHaveBeenCalledWith(`${mockPath}/file1.txt`);
      expect(fs.stat).toHaveBeenCalledWith(`${mockPath}/file2.txt`);
    });

    it("should return the correct size for a directory with nested subdirectories", async () => {
      (fs.readdir as Mock)
        .mockResolvedValueOnce([
          { name: "file1.txt", isDirectory: () => false },
          { name: "subdir", isDirectory: () => true },
        ])
        .mockResolvedValueOnce([
          { name: "file2.txt", isDirectory: () => false },
        ]);
      (fs.stat as Mock)
        .mockResolvedValueOnce({ size: 50 })
        .mockResolvedValueOnce({ size: 150 });

      const size = await getDirectorySize(mockPath);
      expect(size).toBe(200);
      expect(fs.readdir).toHaveBeenCalledWith(mockPath, {
        withFileTypes: true,
      });
      expect(fs.readdir).toHaveBeenCalledWith(`${mockPath}/subdir`, {
        withFileTypes: true,
      });
      expect(fs.stat).toHaveBeenCalledWith(`${mockPath}/file1.txt`);
      expect(fs.stat).toHaveBeenCalledWith(`${mockPath}/subdir/file2.txt`);
    });

    it("should throw an error if readdir fails", async () => {
      const mockError = new Error("Failed to read directory");
      (fs.readdir as Mock).mockRejectedValue(mockError);

      await expect(getDirectorySize(mockPath)).rejects.toThrow(
        "Failed to read directory",
      );
    });

    it("should throw an error if stat fails", async () => {
      (fs.readdir as Mock).mockResolvedValue([
        { name: "file1.txt", isDirectory: () => false },
      ]);
      const mockError = new Error("Failed to stat file");
      (fs.stat as Mock).mockRejectedValue(mockError);

      await expect(getDirectorySize(mockPath)).rejects.toThrow(
        "Failed to stat file",
      );
    });
  });
});
