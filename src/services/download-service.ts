import type {
  DownloadManager,
  StartDownloadOptions,
} from "../managers/download/index.js";
import logger from "../utils/logger.js";

export class DownloadService {
  constructor(private downloadManager: DownloadManager) {}

  public async startDownload(
    options: Omit<StartDownloadOptions, "estimatedSizeGB">,
  ): Promise<string> {
    logger.info(`DownloadService: Starting download`, options);
    return this.downloadManager.startDownload(options);
  }

  public async cancelDownload(downloadId: string): Promise<void> {
    logger.info(`DownloadService: Cancelling download`, {
      downloadId,
    });
    await this.downloadManager.cancelDownload(downloadId);
  }

  public getStatus(downloadId: string) {
    logger.debug(`DownloadService: Getting status for download ${downloadId}`);
    return this.downloadManager.getDownloadStatus(downloadId);
  }

  public getAllStatus() {
    logger.debug("DownloadService: Getting all download statuses");
    return this.downloadManager.getAllStatus();
  }
}
