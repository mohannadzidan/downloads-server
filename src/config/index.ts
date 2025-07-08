import {
  type AppConfig,
  AppConfigSchema,
  type VolumeConfig,
} from "./config.js";
export type { VolumeConfig };

import * as fs from "node:fs";
import * as path from "node:path";
import z from "zod";
import logger from "../utils/logger.js";

const CONFIG_FILE_PATH = path.join(process.cwd(), "config.json");

let appConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (appConfig) {
    return appConfig;
  }

  try {
    const configFileContent = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
    const parsedConfig = JSON.parse(configFileContent);
    appConfig = AppConfigSchema.parse(parsedConfig);
    logger.info("Configuration loaded and validated successfully.");
    return appConfig;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      logger.error(`Error: config.json not found at ${CONFIG_FILE_PATH}`);
      logger.error("Please create a config.json based on config.example.json");
      process.exit(1);
    } else if (error instanceof z.ZodError) {
      logger.error("Invalid configuration:", error.errors);
      process.exit(1);
    } else {
      logger.error(`Failed to load configuration: ${errorMessage}`);
      process.exit(1);
    }
  }
}

export function getConfig(): AppConfig {
  if (!appConfig) {
    // Load configuration
    appConfig = loadConfig();
    // throw new Error('Configuration has not been loaded. Call loadConfig() first.');
  }
  return appConfig;
}

export function getVolumeConfig(volumeName: string): VolumeConfig | undefined {
  const config = getConfig();
  return config.volumes.find((volume) => volume.name === volumeName);
}
