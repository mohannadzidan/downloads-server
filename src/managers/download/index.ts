import path from "node:path";
import { throttle } from "lodash-es";
import { v4 as uuidv4 } from "uuid";
import type {
  RuntimeDownloadState,
  StaticDownloadState,
} from "../../entities/download-state.js";
import { ensureDirectoryExists } from "../../utils/file-system.js";
import logger from "../../utils/logger.js";
import type { SseManager } from "../sse/index.ts";
import type { VolumeManager } from "../volume/index.js";
import { DirectDownloadProvider } from "./direct-download-provider.js";
import {
  type DownloadProcess,
  DownloadProcessInstance,
} from "./download-process.js";
import type {
  CancellationHandle,
  DownloadProvider,
  OnCompleteCallback,
  OnErrorCallback,
  OnProgressCallback,
  OnStartCallback,
} from "./download-provider.js";
import type { DownloadStateStore } from "./download-state-store.js";
import { TorrentDownloadProvider } from "./torrent-download-provider.js";

export type DownloadMethod = "direct" | "torrent" | "magnet";

export interface StartDownloadOptions {
  method: DownloadMethod;
  url: string;
  tags: string[];
}

class DownloadManager {
  private volumeManager: VolumeManager;
  private sseManager: SseManager;
  private downloadProviders: Map<DownloadMethod, DownloadProvider>;
  private activeDownloads: Map<
    string,
    { process: DownloadProcess; cancel: CancellationHandle }
  > = new Map();
  private downloadStateStore: DownloadStateStore;

  constructor(
    volumeManager: VolumeManager,
    sseManager: SseManager,
    downloadStateStore: DownloadStateStore,
  ) {
    this.downloadStateStore = downloadStateStore;
    this.volumeManager = volumeManager;
    this.sseManager = sseManager;
    this.downloadProviders = new Map();
  }

  public async initialize(): Promise<void> {
    const directProvider = new DirectDownloadProvider();
    this.downloadProviders.set("direct", directProvider);
    const torrentProvider = new TorrentDownloadProvider();
    this.downloadProviders.set("torrent", torrentProvider);
    // this.downloadProviders.set("magnet", magnetProvider); // Magnet provider will be added later if needed
    logger.info("download manager initialized!");
  }

  public async startDownload(options: StartDownloadOptions): Promise<string> {
    const { method, tags } = options;
    const downloadId = uuidv4();
    logger.info(`Initiating download ${downloadId} with method ${method}`);

    const provider = this.downloadProviders.get(method);
    if (!provider) {
      const errorMessage = `Unsupported download method: ${method}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    logger.info(`estimating size for ${downloadId}`);
    const estimatedSizeGb =
      (await provider.getEstimatedSize(options.url)) / 1024 ** 3;
    logger.info(`size estimated to be ${estimatedSizeGb}GB`);

    const selectedVolume = this.volumeManager.selectVolume(
      estimatedSizeGb,
      tags,
    );
    if (!selectedVolume) {
      const errorMessage = `No suitable volume found for download with estimated size ${estimatedSizeGb}GB and tags ${tags.join(
        ", ",
      )}.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const destinationPath = path.join(selectedVolume.path, downloadId);
    await ensureDirectoryExists(destinationPath);
    logger.info(
      `Selected volume ${selectedVolume.name} for download ${downloadId}. Destination: ${destinationPath}`,
    );

    const state = await this.downloadStateStore.addDownload({
      downloadId,
      status: "pending",
      createdAt: Date.now(),
      url: options.url,
      filePath: destinationPath,
      method,
    });

    const downloadProcess = new DownloadProcessInstance(
      state?.toStaticDownloadState()!,
      0,
      estimatedSizeGb,
      0,
      0,
      -1,
    );

    const throttledProgressBroadcast = throttle(
      (data: RuntimeDownloadState) =>
        this.sseManager.broadcast(downloadId, "progress", data),
      1000,
      { trailing: true },
    );

    const onStart: OnStartCallback = async () => {
      downloadProcess.start();
      logger.info(
        `Starting download for ${downloadProcess.filePath}. Total size: ${downloadProcess.totalBytes} bytes.`,
      );
      await this.downloadStateStore.updateDownload(downloadId, {
        status: "downloading",
      });
    };

    const onProgress: OnProgressCallback = async (data) => {
      downloadProcess.updateProgress(
        data.downloadedBytes,
        data.totalBytes,
        data.speed,
        data.eta,
      );
      throttledProgressBroadcast(downloadProcess.toRuntimeState());
    };

    const onComplete: OnCompleteCallback = async () => {
      throttledProgressBroadcast.cancel();
      downloadProcess.complete();
      await this.downloadStateStore.updateDownload(downloadId, {
        status: "completed",
      });
      this.activeDownloads.delete(downloadId);
      logger.info(`Download ${downloadId} completed.}`, {
        path: downloadProcess.filePath,
      });
      this.sseManager.broadcast(downloadId, "completed", {
        downloadId,
        status: "completed",
        progress: 100,
        filePath: downloadProcess.filePath,
      });
    };

    const onError: OnErrorCallback = async (error: Error) => {
      throttledProgressBroadcast.cancel();
      downloadProcess.fail(error);
      await this.downloadStateStore.updateDownload(downloadId, {
        status: "failed",
        errorMessage: error.message,
      });
      this.activeDownloads.delete(downloadId);
      logger.error(`Download ${downloadId} failed: ${error.message}`);
      this.sseManager.broadcast(downloadId, "error", {
        downloadId,
        status: "failed",
        errorMessage: error.message,
      });
    };

    try {
      const cancellationHandle = await provider.start(
        options.url,
        destinationPath,
        onStart,
        onProgress,
        onComplete,
        onError,
      );
      this.activeDownloads.set(downloadId, {
        process: downloadProcess,
        cancel: cancellationHandle,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.downloadStateStore.updateDownload(downloadId, {
        status: "failed",
        errorMessage: errorMessage,
      });
      logger.error(`Failed to start download ${downloadId}: ${errorMessage}`);
      throw error;
    }
    return downloadId;
  }

  public async cancelDownload(downloadId: string): Promise<void> {
    const download = this.activeDownloads.get(downloadId);
    if (download) {
      download.cancel.cancel();
      download.process.cancel(); // This will set state and emit event
      this.activeDownloads.delete(downloadId);
      logger.info(`Download ${downloadId} cancelled.`);
    } else {
      logger.warn(
        `Attempted to cancel non-existent or inactive download: ${downloadId}`,
      );
      throw new Error(`Download ${downloadId} not found or not active.`);
    }
  }

  public async getDownloadStatus(
    downloadId: string,
  ): Promise<StaticDownloadState | RuntimeDownloadState | undefined> {
    const runtimeState = this.activeDownloads.get(downloadId);
    if (runtimeState) {
      return runtimeState.process;
    }
    return this.downloadStateStore.getDownload(downloadId);
  }

  public async getAllStatus(): Promise<
    (StaticDownloadState | RuntimeDownloadState)[]
  > {
    const staticStates = await this.downloadStateStore.getAllDownloads();
    const states = staticStates.map(
      (s) =>
        this.activeDownloads.get(s.downloadId)?.process.toRuntimeState() ?? s,
    );
    return states;
  }
}

export { DownloadManager };
