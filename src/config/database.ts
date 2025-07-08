import "reflect-metadata";
import { DataSource } from "typeorm";
import { DownloadState } from "../entities/download-state.js";
import logger from "../utils/logger.js";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "downloads.sqlite",
  synchronize: true, // In production, use migrations instead
  logging: false,
  entities: [DownloadState],
});

export async function initializeDataSource() {
  try {
    await AppDataSource.initialize();
    logger.info("Data Source has been initialized!");
  } catch (err) {
    logger.error("Error during Data Source initialization:", err);
    process.exit(1);
  }
}
