import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import axios from "axios";
import WebTorrent from "webtorrent";
import { getConfig } from "../../config/index.js";
import { ensureDirectoryExists } from "../../utils/file-system.js";
import logger from "../../utils/logger.js";
import type {
  CancellationHandle,
  DownloadProvider,
  OnCompleteCallback,
  OnErrorCallback,
  OnProgressCallback,
  OnStartCallback,
} from "./download-provider.js";

export class TorrentDownloadProvider implements DownloadProvider {
  private client: WebTorrent.Instance;
  private torrentFilesPath: string;

  constructor() {
    this.client = new WebTorrent();
    this.torrentFilesPath =
      getConfig().providers.torrent.downloadTorrentFilesPath;
    ensureDirectoryExists(this.torrentFilesPath);
  }

  private async downloadTorrentFile(torrentUrl: string): Promise<string> {
    const urlHash = createHash("sha256").update(torrentUrl).digest("hex");
    const torrentFileName = `${urlHash}.torrent`;
    const torrentFilePath = path.join(this.torrentFilesPath, torrentFileName);

    if (fs.existsSync(torrentFilePath)) {
      logger.info(
        `Torrent file for ${torrentUrl} already exists at ${torrentFilePath}. Skipping download.`,
      );
      return torrentFilePath;
    }

    logger.info(
      `Downloading torrent file from ${torrentUrl} to ${torrentFilePath}`,
    );
    const response = await axios.get(torrentUrl, {
      responseType: "arraybuffer",
    });
    fs.writeFileSync(torrentFilePath, Buffer.from(response.data));
    logger.info(`Torrent file downloaded to ${torrentFilePath}`);
    return torrentFilePath;
  }

  async start(
    url: string,
    destinationPath: string,
    onStart: OnStartCallback,
    onProgress: OnProgressCallback,
    onComplete: OnCompleteCallback,
    onError: OnErrorCallback,
  ): Promise<CancellationHandle> {
    let torrent: WebTorrent.Torrent | null = null;
    try {
      let torrentIdentifier: string;

      if (url.startsWith("magnet:")) {
        torrentIdentifier = url;
        logger.info(`Starting torrent download from magnet URI: ${url}`);
      } else {
        const torrentFilePath = await this.downloadTorrentFile(url);
        torrentIdentifier = torrentFilePath;
      }

      torrent = this.client.add(torrentIdentifier, { path: destinationPath });
      torrent.on("ready", () => {
        logger.info(`Metadata for torrent ${torrent?.name} loaded.`);
        onStart();
      });

      torrent.on("download", () => {
        onProgress({
          downloadedBytes: torrent?.downloaded ?? 0,
          totalBytes: torrent?.length ?? 0,
          speed: torrent?.downloadSpeed ?? 0,
          eta: torrent?.timeRemaining ?? 0,
        });
      });

      torrent.on("done", () => {
        logger.info(
          `Torrent ${torrent?.name} downloaded to ${destinationPath}`,
        );
        onComplete();
        this.client.remove(torrent as WebTorrent.Torrent);
      });

      torrent.on("error", () => {
        onError(new Error("Torrent Error"));
        this.client.remove(torrent as WebTorrent.Torrent);
      });

      return {
        cancel: () => {
          if (torrent) {
            this.client.remove(torrent as WebTorrent.Torrent);
            logger.info(`Torrent download for ${torrent?.name} cancelled.`);
          }
        },
      };
    } catch (error: unknown) {
      logger.error(`Failed to start torrent download for ${url}`, { error });
      onError(error instanceof Error ? error : new Error(String(error)));
      if (torrent) {
        this.client.remove(torrent as WebTorrent.Torrent);
      }
      throw error;
    }
  }

  async getEstimatedSize(_url: string): Promise<number> {
    // For torrents, estimating size before adding is complex as it requires metadata.
    // We can potentially download the .torrent file and parse it to get the size,
    // but for simplicity and to avoid double-downloading, we'll return 0 here
    // and rely on the volume manager to handle potential overages during download.
    // A more robust solution would involve parsing the torrent file's metadata.
    // logger.warn(
    //   `Estimated size for torrents is not directly available before download starts. Returning 0 for ${url}.`
    // );
    return 0;
  }
}
