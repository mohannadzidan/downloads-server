import * as fs from "node:fs";
import * as path from "node:path";
import type Stream from "node:stream";
import axios from "axios";
import logger from "../../utils/logger.js";
import type {
  CancellationHandle,
  DownloadProvider,
  OnCompleteCallback,
  OnErrorCallback,
  OnProgressCallback,
  OnStartCallback,
} from "./download-provider.js";

export class DirectDownloadProvider implements DownloadProvider {
  async start(
    url: string,
    destinationPath: string,
    _onStart: OnStartCallback,
    onProgress: OnProgressCallback,
    onComplete: OnCompleteCallback,
    onError: OnErrorCallback,
  ): Promise<CancellationHandle> {
    const abortController = new AbortController();
    const parsedUrl = new URL(url);
    const fileName = path.basename(parsedUrl.pathname);
    const downloadPath = path.join(destinationPath, fileName);
    let downloadedBytes = 0;
    let lastProgressTime = Date.now();

    const cancellationHandle: CancellationHandle = {
      cancel: () => {
        abortController.abort();
      },
    };

    try {
      const response = await axios({
        method: "get",
        url: url,
        responseType: "stream",
        signal: abortController.signal,
      });
      const stream = response.data as Stream;
      const totalBytes = parseInt(
        response.headers["content-length"] ?? "-1",
        10,
      );

      const writer = fs.createWriteStream(downloadPath);
      stream.pipe(writer);

      stream.on("data", (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const currentTime = Date.now();
        const timeElapsed = (currentTime - lastProgressTime) / 1000;

        if (timeElapsed > 0.1) {
          const speed = chunk.length / timeElapsed;
          const eta = speed > 0 ? (totalBytes - downloadedBytes) / speed : -1;
          onProgress({ downloadedBytes, totalBytes, speed, eta });
          lastProgressTime = currentTime;
        }
      });

      stream.on("end", () => {
        writer.end();
        logger.info(`Direct download for ${fileName} completed.`);
        onComplete();
      });

      stream.on("error", (err: Error) => {
        writer.destroy();
        logger.error(
          `Error during direct download for ${fileName}: ${err.message}`,
        );
        onError(err instanceof Error ? err : new Error(String(err)));
      });

      writer.on("error", (error: unknown) => {
        logger.error(`File system error writing ${fileName}`, { error });
        onError(error as Error);
      });
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        logger.info(`Direct download for ${fileName} cancelled.`);
      } else {
        logger.error(`Failed to start direct download for ${fileName}`, {
          error,
        });
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }

    return cancellationHandle;
  }

  async getEstimatedSize(url: string): Promise<number> {
    try {
      const response = await axios.head(url);
      const contentLength = response.headers["content-length"];
      if (contentLength) {
        return parseInt(contentLength, 10);
      } else {
        logger.warn(
          `Content-Length header not found for ${url}. Cannot estimate size.`,
        );
        return 0;
      }
    } catch (error: unknown) {
      logger.error(`Failed to get estimated size for ${url}`, { error });
      throw error;
    }
  }
}
