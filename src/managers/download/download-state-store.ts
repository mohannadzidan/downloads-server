import type { Repository } from "typeorm";
import { AppDataSource } from "../../config/database.js";
import {
  DownloadState,
  type StaticDownloadState,
} from "../../entities/download-state.js";
import logger from "../../utils/logger.js";

export type { DownloadState } from "../../entities/download-state.js";

export class DownloadStateStore {
  private downloadRepository: Repository<DownloadState> =
    AppDataSource.getRepository(DownloadState);

  public async prepare() {
    // TODO: resuming downloads
  }

  public async addDownload(state: StaticDownloadState) {
    try {
      await this.downloadRepository.save(state);
      const result = await this.downloadRepository.findOneBy({
        downloadId: state.downloadId,
      });
      logger.info(`Download ${state.downloadId} added to DB.`, state);
      return result!;
    } catch (err) {
      logger.error(`Error adding download ${state.downloadId} to DB:`, err);
      throw err;
    }
  }

  public async updateDownload(
    downloadId: string,
    updates: Partial<DownloadState>,
  ): Promise<void> {
    try {
      await this.downloadRepository.update({ downloadId }, updates);
    } catch (err) {
      logger.error(`Error updating download ${downloadId} in DB:`, err);
      throw err;
    }
  }

  public async removeDownload(downloadId: string): Promise<void> {
    try {
      await this.downloadRepository.delete(downloadId);
      logger.info(`Download ${downloadId} removed from DB.`);
    } catch (err) {
      logger.error(`Error removing download ${downloadId} from DB:`, err);
      throw err;
    }
  }

  public async getDownload(
    downloadId: string,
  ): Promise<StaticDownloadState | undefined> {
    const state = await this.downloadRepository.findOneBy({ downloadId });
    return state?.toStaticDownloadState();
  }

  public async getAllDownloads(): Promise<StaticDownloadState[]> {
    const state = await this.downloadRepository.find({});
    return state.map((s) => s.toStaticDownloadState());
  }
}
