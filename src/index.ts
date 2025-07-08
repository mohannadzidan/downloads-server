import "reflect-metadata";
import cors from "cors";
import express from "express";
import createApiRouter from "./api/index.js";
import { initializeDataSource } from "./config/database.js";
import { getConfig, loadConfig } from "./config/index.js";
import { DownloadStateStore } from "./managers/download/download-state-store.js";
import { DownloadManager } from "./managers/download/index.js";
import { SseManager } from "./managers/sse/index.js";
import { VolumeManager } from "./managers/volume/index.js";
import { DownloadService } from "./services/index.js";
import { errorHandler } from "./utils/error-handler.js";
import logger from "./utils/logger.js";

async function bootstrap() {
  // Load configuration
  loadConfig();
  // Initialize Database
  await initializeDataSource();

  const config = getConfig();

  // Initialize Managers
  const volumeManager = new VolumeManager();
  const sseManager = new SseManager();
  const downloadStateStore = new DownloadStateStore();
  const downloadManager = new DownloadManager(
    volumeManager,
    sseManager,
    downloadStateStore,
  );
  await downloadStateStore.prepare();
  await downloadManager.initialize();

  // Initialize Services
  const downloadService = new DownloadService(downloadManager);

  // Initialize Volume Manager (ensures directories exist and starts monitoring)
  await volumeManager.initialize();

  const app = express();

  app.use(cors());
  // Middleware
  app.use(express.json());

  // API Routes
  app.use("/api", createApiRouter(downloadService, sseManager));

  // Global Error Handler
  app.use(errorHandler);

  const Port = config.server.port;
  const Host = config.server.host;

  const server = app.listen(Port, Host, () => {
    logger.info(`Server running on http://${Host}:${Port}`);
  });

  // Graceful Shutdown
  const gracefulShutdown = async () => {
    logger.info("Shutting down gracefully...");
    server.close(async () => {
      logger.info("HTTP server closed.");
      volumeManager.stopMonitoring();
      logger.info("Application shutdown complete.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", err);
    gracefulShutdown();
  });
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown();
  });
}

bootstrap();
