import { EventEmitter } from "node:events";
import type {
  RuntimeDownloadState,
  StaticDownloadState,
} from "../../entities/download-state.js";

export interface DownloadProcess extends RuntimeDownloadState {
  // id: string;
  // downloadedBytes: number; // readonly
  // totalBytes: number; // readonly
  // progress: number; // readonly - value between 0 and 100
  // speed: number; // readonly - in bytes/s
  // eta: number; // readonly - estimated time in milliseconds
  // status: "completed" | "pending" | "failed" | "cancelled"; // readonly
  // method: "direct" | "magnet" | "torrent"; // readonly
  // url: string; // readonly
  // destinationPath: string; // readonly

  // createdAt: string;
  // downloadedBytes: string;
  // downloadId: string;
  // eta: string;
  // filePath: string;
  // method: string;
  // progress: string;
  // speed: string;
  // status: string;
  // totalBytes: string;
  // url: string;
  // errorMessage: string;

  cancel(): void;

  on(event: "start", listener: (process: DownloadProcess) => void): void;
  on(event: "complete", listener: (process: DownloadProcess) => void): void;
  on(event: "progress", listener: (process: DownloadProcess) => void): void;
  on(
    event: "failure",
    listener: (process: DownloadProcess, error: unknown) => void,
  ): void;
  on(event: "cancelled", listener: (process: DownloadProcess) => void): void;

  off(event: string | symbol, listener: (...args: unknown[]) => void): this;

  emit(event: string, ...args: unknown[]): boolean;

  toRuntimeState(): RuntimeDownloadState;
}

export class DownloadProcessInstance
  extends EventEmitter
  implements DownloadProcess
{
  private _downloadId: string;
  private _status: StaticDownloadState["status"] = "pending";
  private _filePath: string;
  private _url: string;
  private _method: string;
  private _createdAt: number;
  private _errorMessage?: string | undefined = undefined;
  private _downloadedBytes: number;
  private _totalBytes: number;
  private _progress: number;
  private _speed: number;
  private _eta: number;

  public get downloadId(): string {
    return this._downloadId;
  }
  public get status() {
    return this._status;
  }
  public get filePath() {
    return this._filePath;
  }
  public get url() {
    return this._url;
  }
  public get method() {
    return this._method;
  }
  public get createdAt() {
    return this._createdAt;
  }
  public get errorMessage() {
    return this._errorMessage;
  }
  public get downloadedBytes() {
    return this._downloadedBytes;
  }
  public get totalBytes() {
    return this._totalBytes;
  }
  public get progress() {
    return this._progress;
  }
  public get speed() {
    return this._speed;
  }
  public get eta() {
    return this._eta;
  }

  constructor(
    state: StaticDownloadState,
    downloadedBytes: number,
    totalBytes: number,
    progress: number,
    speed: number,
    eta: number,
  ) {
    super();
    this._downloadId = state.downloadId;
    this._status = state.status;
    this._filePath = state.filePath;
    this._url = state.url;
    this._method = state.method;
    this._createdAt = state.createdAt;
    this._errorMessage = state.errorMessage;
    this._downloadedBytes = downloadedBytes;
    this._totalBytes = totalBytes;
    this._progress = progress;
    this._speed = speed;
    this._eta = eta;
  }

  setTotalBytes(totalBytes: number) {
    this._totalBytes = totalBytes;
  }

  updateProgress(
    downloadedBytes: number,
    totalBytes: number,
    speed: number,
    eta: number,
  ) {
    this._downloadedBytes = downloadedBytes;
    this._totalBytes = totalBytes;
    this._speed = speed;
    this._eta = eta;
    this._progress =
      totalBytes === -1 ? -1 : (downloadedBytes / totalBytes) * 100;
    this.emit("progress", this);
  }

  start() {
    this._status = "downloading";
    this.emit("start", this);
  }

  complete() {
    this._status = "completed";
    this.emit("complete", this);
  }

  fail(error: unknown) {
    this._status = "failed";
    this.emit("failure", this, error);
  }

  cancel(): void {
    if (this._status === "pending") {
      this._status = "cancelled";
      this.emit("cancelled", this);
    }
  }

  off(event: string | symbol, listener: (...args: unknown[]) => void): this {
    super.off(event, listener);
    return this;
  }

  toRuntimeState(): RuntimeDownloadState {
    return {
      createdAt: this.createdAt,
      downloadedBytes: this.downloadedBytes,
      downloadId: this.downloadId,
      eta: this.eta,
      filePath: this.filePath,
      method: this.method,
      progress: this.progress,
      speed: this.speed,
      status: this.status,
      totalBytes: this.totalBytes,
      url: this.url,
      errorMessage: this.errorMessage,
    };
  }
}
