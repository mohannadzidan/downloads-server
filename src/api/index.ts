import { Router } from "express";
import type { SseManager } from "../managers/sse/index.js";
import type { DownloadService } from "../services/download-service.js";
import createDownloadRoutes from "./routes/download-routes.js";

export default function createApiRouter(
  downloadService: DownloadService,
  sseManager: SseManager,
): Router {
  const router = Router();
  const v1Router = Router();

  // Mount the download-related routes under the '/downloads' path
  v1Router.use("/downloads", createDownloadRoutes(downloadService, sseManager));

  router.use("/v1", v1Router);

  return router;
}
