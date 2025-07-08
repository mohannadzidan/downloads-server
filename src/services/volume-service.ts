import type { VolumeManager } from "../managers/volume/index.js";
import logger from "../utils/logger.js";

export class VolumeService {
  constructor(private volumeManager: VolumeManager) {}

  public getVolumeState(volumeName: string) {
    logger.debug(`VolumeService: Getting state for volume ${volumeName}`);
    return this.volumeManager.getVolumeState(volumeName);
  }

  public getAllVolumeStates() {
    logger.debug("VolumeService: Getting all volume states");
    return this.volumeManager.getAllVolumeStates();
  }
}
