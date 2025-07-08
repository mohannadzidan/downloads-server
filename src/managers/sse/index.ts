import EventEmitter2 from "eventemitter2";
import type { Request, Response } from "express";
import logger from "../../utils/logger.js";
import type { DownloadState } from "../download/download-state-store.js";

/**
 * Represents a single Server-Sent Events (SSE) client connection.
 * @property {string} id - A unique identifier for the client.
 * @property {Response} response - The Express Response object associated with the client's SSE connection.
 */
interface SseClient {
  id: string;
  response: Response;
}

export class SseManager {
  private emitter = new EventEmitter2({
    wildcard: true,
  });
  private idCounter = 1;

  public addClient(downloadId: string, req: Request, res: Response): string {
    const clientId = (this.idCounter++).toString(); // Simple unique ID for the client

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      connection: "keep-alive",
    });

    const client: SseClient = { id: clientId, response: res };

    this.emitter.on(`${clientId}.${downloadId}`, (event: string, data) => {
      this.writeEvent(client, event, data);
    });
    logger.info(
      `SSE client ${clientId} connected for downloadId ${downloadId}`,
    );

    req.on("close", () => {
      this.removeClient(clientId);
      logger.info(
        `SSE client ${clientId} disconnected from downloadId ${downloadId}`,
      );
    });
    return clientId;
  }

  public removeClient(clientId: string): void {
    this.emitter.removeAllListeners(`${clientId}.*`);
  }

  public writeEvent(
    client: SseClient,
    eventName: string,
    data: DownloadState | unknown,
  ): void {
    const eventData = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    try {
      client.response.write(eventData);
    } catch (error) {
      logger.error(`Error sending to SSE client ${client.id}  ${error}`);
      this.emitter.removeAllListeners(`${client.id}.*`);
    }
  }

  public broadcast(
    downloadId: string,
    eventName: string,
    data: DownloadState | unknown,
  ): void {
    this.emitter.emit(`*.${downloadId}`, eventName, data);
  }

  public getClientCount(downloadId: string): number {
    return this.emitter.listenerCount(`*.${downloadId}`);
  }
}
