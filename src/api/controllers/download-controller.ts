import { R_OK } from "node:constants";
import { access, stat } from "node:fs/promises";
import { join } from "node:path";
import type { NextFunction, Request, Response } from "express";
import type { SseManager } from "../../managers/sse/index.ts";
import type { DownloadService } from "../../services/index.js";
import { AppError } from "../../utils/error-handler.js";
import { getFiles } from "../../utils/file-system.js";
import logger from "../../utils/logger.js";
export class DownloadController {
  constructor(
    private downloadService: DownloadService,
    private sseManager: SseManager,
  ) {}

  public startDownload = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const downloadId = await this.downloadService.startDownload(req.body);
      res.status(202).json({ status: "success", data: { downloadId } });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error starting download: ${errorMessage}`);
      next(new AppError(errorMessage, 500));
    }
  };

  public getStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { downloadId } = req.params;
      const status = await this.downloadService.getStatus(downloadId);

      if (!status) {
        return next(
          new AppError(`Download with ID ${downloadId} not found.`, 404),
        );
      }

      res.status(200).json({ status: "success", data: status });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error getting download status: ${errorMessage}`);
      next(new AppError(errorMessage, 500));
    }
  };

  public streamDownloadEvents = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { downloadId } = req.params;
      const currentStatus = this.downloadService.getStatus(downloadId);
      this.sseManager.addClient(downloadId, req, res);

      // Send current status immediately if available
      if (currentStatus) {
        this.sseManager.broadcast(downloadId, "status", currentStatus);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error streaming download events: ${errorMessage}`);
      next(new AppError(errorMessage, 500));
    }
  };

  public cancelDownload = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { downloadId } = req.params;
      await this.downloadService.cancelDownload(downloadId);
      res.status(200).json({
        status: "success",
        message: `Download ${downloadId} cancelled.`,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error cancelling download: ${errorMessage}`);
      next(new AppError(errorMessage, 500));
    }
  };

  public getAllStatuses = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const statuses = await this.downloadService.getAllStatus();
      res.status(200).json({ status: "success", data: statuses });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error getting all download statuses: ${errorMessage}`);
      next(new AppError(errorMessage, 500));
    }
  };

  public listDownloadDirectoryFiles = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const { downloadId } = req.params;
    const status = await this.downloadService.getStatus(downloadId);
    if (!status) {
      return next(
        new AppError(`Download with ID ${downloadId} not found.`, 404),
      );
    }
    const files = await getFiles(status.filePath);

    res.json({
      status: "success",
      data: {
        directory: status.filePath.replaceAll(/\\/g, "/"),
        files: files.map((f) =>
          f.substring(status.filePath.length).replaceAll(/\\/g, "/"),
        ),
      },
    });
  };

  public readDownloadDirectoryFile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const path = (req.params.path as unknown as string[]).join("/");
    const { downloadId } = req.params;
    const status = await this.downloadService.getStatus(downloadId);
    if (!status) {
      return next(
        new AppError(`Download with ID ${downloadId} not found.`, 404),
      );
    }
    const file = join(status.filePath, path);
    try {
      await access(file, R_OK);
    } catch {
      return next(new AppError(`File not found`, 404));
    }
    const fileStat = await stat(file);
    if (!fileStat.isFile()) {
      return next(new AppError(`File not found`, 404));
    }
    res.sendFile(file, {
      acceptRanges: true,
    });
  };
}
