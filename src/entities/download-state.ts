import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("downloads")
export class DownloadState implements StaticDownloadState {
  @PrimaryColumn("uuid")
  downloadId!: string;

  @Column("text")
  method!: string;

  @Column("text")
  status!: StaticDownloadState["status"];

  @Column({ nullable: true })
  filePath!: string; // Absolute path to the downloaded file/directory

  @Column()
  url!: string;

  @Column("integer")
  createdAt!: number; // Timestamp of when the download was initiated

  @Column({ nullable: true })
  errorMessage?: string; // If status is 'failed'

  public toStaticDownloadState(): StaticDownloadState {
    return {
      downloadId: this.downloadId,
      filePath: this.filePath,
      status: this.status,
      url: this.url,
      errorMessage: this.errorMessage,
      method: this.method,
      createdAt: this.createdAt,
    };
  }
}
export interface StaticDownloadState {
  downloadId: string;

  status:
    | "pending"
    | "downloading"
    | "completed"
    | "failed"
    | "paused"
    | "cancelled";

  filePath: string; // Absolute path to the downloaded file/directory

  url: string; // For direct downloads

  method: string;

  createdAt: number;

  errorMessage?: string;
}

export interface RuntimeDownloadState extends StaticDownloadState {
  downloadedBytes: number;
  totalBytes: number;
  progress: number;
  speed: number;
  eta: number;
}
