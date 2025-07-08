import { getConfig, type VolumeConfig } from "../../config/index.js";
import {
  checkDiskSpace,
  ensureDirectoryExists,
  getDirectorySize,
} from "../../utils/file-system.js";
import logger from "../../utils/logger.js";

interface VolumeState {
  name: string;
  path: string;
  maxSizeGb: number;
  tags: string[];
  freeSpaceBytes: number;
  currentUsageBytes: number; // New field to track actual usage of the virtual volume
  lastChecked: number;
}

class VolumeMonitor {
  private volumes: Map<string, VolumeState> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 60 * 1000; // Check every 1 minute

  constructor() {
    const config = getConfig();
    config.volumes.forEach((vol) => {
      this.volumes.set(vol.name, {
        ...vol,
        freeSpaceBytes: 0,
        currentUsageBytes: 0,
        lastChecked: 0,
      });
    });
  }

  public async initialize(): Promise<void> {
    logger.info("Initializing VolumeMonitor...");
    const initializationPromises = Array.from(this.volumes.entries()).map(
      async ([name, vol]) => {
        try {
          await ensureDirectoryExists(vol.path);
          await this.updateVolumeSpace(name);
          await this.updateVolumeUsage(name);
        } catch (error) {
          logger.error(
            `Failed to initialize volume ${name} at ${vol.path}: ${error}`,
          );
        }
      },
    );
    await Promise.all(initializationPromises);
    logger.info("VolumeMonitor initialized.");
  }

  public startMonitoring(): void {
    if (this.intervalId) {
      logger.warn("Volume monitoring is already running.");
      return;
    }
    logger.info("Starting volume monitoring...");
    this.intervalId = setInterval(
      () => this.monitorVolumes(),
      this.checkIntervalMs,
    );
  }

  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Stopped volume monitoring.");
    }
  }

  private async monitorVolumes(): Promise<void> {
    logger.debug("Monitoring volumes...");
    const monitoringPromises = Array.from(this.volumes.entries()).map(
      async ([name]) => {
        try {
          await this.updateVolumeSpace(name);
          await this.updateVolumeUsage(name);
        } catch (error) {
          logger.error(`Error monitoring volume ${name}: ${error}`);
        }
      },
    );
    await Promise.all(monitoringPromises);
  }

  private async updateVolumeSpace(volumeName: string): Promise<void> {
    const volume = this.volumes.get(volumeName);
    if (!volume) {
      logger.warn(`Attempted to update non-existent volume: ${volumeName}`);
      return;
    }

    try {
      const { free } = await checkDiskSpace(volume.path);
      volume.freeSpaceBytes = free;
      volume.lastChecked = Date.now();
      this.volumes.set(volumeName, volume);
      logger.debug(
        `Updated volume ${volumeName}: Free space = ${free / 1024 ** 3} GB`,
      );
    } catch (error) {
      logger.error(`Failed to update space for volume ${volumeName}: ${error}`);
      // Optionally, mark volume as unhealthy or set freeSpaceBytes to 0
      volume.freeSpaceBytes = 0; // Assume no space if check fails
      this.volumes.set(volumeName, volume);
    }
  }

  private async updateVolumeUsage(volumeName: string): Promise<void> {
    const volume = this.volumes.get(volumeName);
    if (!volume) {
      logger.warn(
        `Attempted to update usage for non-existent volume: ${volumeName}`,
      );
      return;
    }

    try {
      const currentUsage = await getDirectorySize(volume.path);
      volume.currentUsageBytes = currentUsage;
      this.volumes.set(volumeName, volume);
      logger.debug(
        `Updated volume ${volumeName} usage: ${currentUsage / 1024 ** 3} GB`,
      );
    } catch (error) {
      logger.error(`Failed to update usage for volume ${volumeName}: ${error}`);
      volume.currentUsageBytes = 0; // Assume 0 if check fails
      this.volumes.set(volumeName, volume);
    }
  }

  public getVolumeState(volumeName: string): VolumeState | undefined {
    return this.volumes.get(volumeName);
  }

  public getAllVolumeStates(): VolumeState[] {
    return Array.from(this.volumes.values());
  }
}

class VolumeSelector {
  constructor(private volumeMonitor: VolumeMonitor) {}

  public selectVolume(
    requiredSizeGb: number,
    tags: string[],
  ): VolumeConfig | null {
    const requiredSizeBytes = requiredSizeGb * 1024 ** 3;
    const allVolumes = this.volumeMonitor.getAllVolumeStates();

    // Filter volumes by tags and sufficient space
    const suitableVolumes = allVolumes.filter((vol) => {
      const hasMatchingTag = tags.some((tag) => vol.tags.includes(tag));
      const hasEnoughPhysicalSpace = vol.freeSpaceBytes >= requiredSizeBytes;
      const hasEnoughVirtualSpace =
        vol.maxSizeGb * 1024 ** 3 - vol.currentUsageBytes >= requiredSizeBytes;

      return hasMatchingTag && hasEnoughPhysicalSpace && hasEnoughVirtualSpace;
    });

    // Sort by most free space, then by name for consistent selection
    suitableVolumes.sort((a, b) => {
      if (b.freeSpaceBytes !== a.freeSpaceBytes) {
        return b.freeSpaceBytes - a.freeSpaceBytes;
      }
      return a.name.localeCompare(b.name);
    });

    if (suitableVolumes.length > 0) {
      logger.info(
        `Selected volume: ${suitableVolumes[0].name} for ${requiredSizeGb}GB with tags ${tags.join(", ")}`,
      );
      return suitableVolumes[0];
    }

    logger.warn(
      `No suitable volume found for ${requiredSizeGb}GB with tags ${tags.join(", ")}`,
    );
    return null;
  }
}

export class VolumeManager {
  private monitor: VolumeMonitor;
  private selector: VolumeSelector;

  constructor() {
    this.monitor = new VolumeMonitor();
    this.selector = new VolumeSelector(this.monitor);
  }

  public async initialize(): Promise<void> {
    await this.monitor.initialize();
    this.monitor.startMonitoring();
  }

  public selectVolume(
    requiredSizeGb: number,
    tags: string[],
  ): VolumeConfig | null {
    return this.selector.selectVolume(requiredSizeGb, tags);
  }

  public getVolumeState(volumeName: string): VolumeState | undefined {
    return this.monitor.getVolumeState(volumeName);
  }

  public getAllVolumeStates(): VolumeState[] {
    return this.monitor.getAllVolumeStates();
  }

  public stopMonitoring(): void {
    this.monitor.stopMonitoring();
  }
}
