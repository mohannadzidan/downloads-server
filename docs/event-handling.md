# Event Handling and Real-time Status Updates

The `downloads-server` provides real-time updates on download progress and status changes primarily through Server-Sent Events (SSE). This section details how events are emitted and consumed.

## Server-Sent Events (SSE)

SSE is used to push one-way event streams from the server to the client. This allows clients to receive continuous updates without needing to poll the server.

### Endpoint

- **`GET /api/v1/downloads/:downloadId/events`**: Clients can subscribe to this endpoint to receive real-time updates for a specific download.

### Event Emission Flow

1.  **Subscription:** When a client subscribes to `GET /downloads/:downloadId/events`, the server establishes a connection and begins sending events as they occur.

2.  **Progress Updates:** As a download progresses, the `DownloadManager` emits `progress` events, which are then broadcasted to subscribed clients by the `SseManager`.

3.  **Broadcasting:** The `SseManager` uses an `EventEmitter2` instance to broadcast events to all clients subscribed to the relevant `downloadId`. Events are of different types (e.g., `progress`, `completed`, `error`) and are structured as JSON objects.

4.  **Completion:** When a download is complete, a `completed` event is emitted that includes the final status and the absolute path to the downloaded content. This `filePath` is crucial for the client to locate the downloaded file on the server.

### Event Data Structure (Example)

Events sent over SSE will typically follow a consistent JSON structure.

```json
{
  "downloadId": "string",
  "status": "string",
  "progress": "number",
  "speed": "number",
  "eta": "number",
  "filePath": "string"
}
```

- **`downloadId`**: The unique identifier for the download.
- **`status`**: The current status of the download (e.g., "downloading", "completed", "failed", "paused").
- **`progress`**: The download progress as a percentage (0-100).
- **`speed`**: The current download speed (e.g., in bytes/second).
- **`eta`**: Estimated time remaining for the download (e.g., in seconds).
- **`filePath`**: (Optional) The absolute path to the downloaded content. This field is present only when the download is completed successfully.

## In-Memory Tracking and Persistence

The application keeps track of ongoing downloads using an in-memory map for quick access. For persistence across server restarts, download states are also stored in a SQLite database, identified by their `downloadId`. This ensures that download progress can be recovered if the server goes down.
