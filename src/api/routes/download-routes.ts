import { Router } from "express";
import type { SseManager } from "../../managers/sse/index.js";
import type { DownloadService } from "../../services/index.js";
import { DownloadController } from "../controllers/download-controller.js";
import { validateDownloadRequest } from "../middlewares/validation-middleware.js";

export default function createDownloadRoutes(
  downloadService: DownloadService,
  sseManager: SseManager,
): Router {
  const downloadController = new DownloadController(
    downloadService,
    sseManager,
  );

  const router = Router();

  router.post(
    "/start",
    validateDownloadRequest,
    downloadController.startDownload,
  );

  router.get("/status", downloadController.getAllStatuses);

  router.get(
    "/:downloadId/files/*path",
    downloadController.readDownloadDirectoryFile,
  );
  router.get(
    "/:downloadId/files",
    downloadController.listDownloadDirectoryFiles,
  );

  router.get("/:downloadId/status", downloadController.getStatus);

  router.get("/:downloadId/events", downloadController.streamDownloadEvents);

  router.post("/:downloadId/cancel", downloadController.cancelDownload);

  return router;
}
