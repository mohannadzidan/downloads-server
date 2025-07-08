interface OnProgressData {
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  eta: number; // TODO: this should be removed, the calculate shall be responsibility of download manager not the provider
}

export type OnStartCallback = () => void;
export type OnProgressCallback = (data: OnProgressData) => void;
export type OnCompleteCallback = () => void;
export type OnErrorCallback = (error: Error) => void;

export interface CancellationHandle {
  cancel: () => void;
}

export interface DownloadProvider {
  start(
    url: string,
    destinationPath: string,
    onStart: OnStartCallback,
    onProgress: OnProgressCallback,
    onComplete: OnCompleteCallback,
    onError: OnErrorCallback,
  ): Promise<CancellationHandle>;

  getEstimatedSize(url: string): Promise<number>;
}
