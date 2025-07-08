import * as fs from "node:fs/promises";
import { resolve } from "node:path";
import logger from "./logger.js";

export async function checkDiskSpace(
  directoryPath: string,
): Promise<{ free: number; size: number }> {
  try {
    // Ensure the directory exists
    await fs.mkdir(directoryPath, { recursive: true });

    const stats = await fs.statfs(directoryPath);

    const freeSpace = stats.bfree * stats.bsize;
    const totalSize = stats.blocks * stats.bsize;

    return { free: freeSpace, size: totalSize };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Failed to check disk space for ${directoryPath}: ${errorMessage}`,
    );
    throw error;
  }
}

export async function ensureDirectoryExists(
  directoryPath: string,
): Promise<void> {
  try {
    await fs.mkdir(directoryPath, { recursive: true });
    logger.info(`Ensured directory exists: ${directoryPath}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Failed to create directory ${directoryPath}: ${errorMessage}`,
    );
    throw error;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch (_e) {
    return false;
  }
}

export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get file size for ${filePath}: ${errorMessage}`);
    throw error;
  }
}

export async function getDirectorySize(directoryPath: string): Promise<number> {
  try {
    const files = await fs.readdir(directoryPath, { withFileTypes: true });

    const fileSizes = await Promise.all(
      files.map(async (file) => {
        const fullPath = `${directoryPath}/${file.name}`;
        if (file.isDirectory()) {
          return getDirectorySize(fullPath); // Recursively get size of subdirectories
        } else {
          const stats = await fs.stat(fullPath);
          return stats.size;
        }
      }),
    );
    return fileSizes.reduce((acc, size) => acc + size, 0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Failed to get directory size for ${directoryPath}: ${errorMessage}`,
    );
    throw error;
  }
}

export async function getFiles(dir: string): Promise<string[]> {
  const dirs = await fs.readdir(dir);
  const files = await Promise.all(
    dirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await fs.stat(res)).isDirectory() ? getFiles(res) : res;
    }),
  );
  return files.flat();
}
