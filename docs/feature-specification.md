# Feature Specification

## Core Functionality

- **Download Methods:** Implement support for `direct` (HTTP/HTTPS), `torrent` (via `.torrent` files), and `magnet` (Magnet URIs) download methods. This involves integrating robust libraries capable of handling large files, managing resume capabilities, and ensuring efficient error recovery.
- **Large File Handling:** Implement streaming and chunking mechanisms to efficiently handle large files, minimizing memory consumption and optimizing disk I/O.
- **Resume Capabilities:** Ensure that downloads can be reliably paused and resumed, which is critical for large files, unstable network conditions, or server restarts. This requires persistent storage of download state.

## API Design

- **Endpoints:**
  - `POST /api/v1/downloads/start`: Initiates a new download. The request body should specify the download type (e.g., `url` for direct, `torrentFile` for torrent, or `magnetUri` for magnet), a `tag` to guide volume selection, and optionally a `fileName`.
  - `GET /api/v1/downloads/status`: Retrieves the statuses of all downloads.
  - `GET /api/v1/downloads/:downloadId/status`: Retrieves the current status and detailed progress of a specific download identified by its `downloadId`.
  - `GET /api/v1/downloads/:downloadId/events`: Establishes a Server-Sent Events (SSE) connection to provide real-time updates on download progress, status changes, and completion events.
  - `POST /api/v1/downloads/:downloadId/cancel`: Cancels an ongoing download identified by its `downloadId`.
  - `GET /api/v1/downloads/:downloadId/files`: Lists the files in the download directory.
  - `GET /api/v1/downloads/:downloadId/files/*path`: Reads a specific file from the download directory.
- **Data Returned:** Standardize response formats across all API endpoints. For download initiation, return a `downloadId`. For status updates, include comprehensive details such as `progress` (percentage), `status` (e.g., 'downloading', 'completed', 'failed'), estimated time of arrival (`eta`), and current download `speed`. Ensure consistent error message structures.

## Volume Management

- **`config.json` Schema:** The `config.json` file is central to defining and managing storage volumes. Its schema and detailed explanation are provided in the [Volumes Documentation](volumes.md).

- **Space Checks:** Before initiating any download, the system must perform a robust check to verify that the chosen volume has sufficient free space to accommodate the incoming content. This includes mechanisms to periodically monitor and update available space statistics for all configured volumes.
- **Error Handling for Full Volumes:** Define clear and informative error responses when a selected volume is full or cannot allocate the required space for a download. This ensures clients receive actionable feedback.
- **Tag Matching:** The download request's `tag` must be accurately matched against the `tags` defined for available volumes. This allows for flexible and intelligent volume selection, ensuring downloads are directed to appropriate storage locations based on their categorization.

## Robustness

- **Error Handling:** Implement comprehensive error handling mechanisms to gracefully manage various failure scenarios, including network issues, file system errors, invalid inputs, and failures from external services. This ensures application stability and provides informative feedback.
- **Logging:** Integrate a robust and configurable logging system (e.g., Winston, Pino) to capture critical application events, detailed error messages, and debug information. Proper logging is essential for monitoring, troubleshooting, and auditing.
- **Graceful Shutdown:** Design the server to shut down gracefully, allowing any ongoing downloads to complete their current operations or be safely paused and persisted. This prevents data corruption and ensures a smooth restart.

## Scalability

- **Concurrent Downloads:** Design the system to efficiently handle multiple concurrent downloads. This will likely involve a queueing mechanism to manage and prioritize download tasks, preventing resource exhaustion.

## Testing

- **Unit Tests:** Write unit tests for individual modules and functions (e.g., download managers, volume selectors, API handlers).
- **Integration Tests:** Develop integration tests to verify the interaction between different components (e.g., API to download manager, download manager to file system).
- **End-to-End Tests:** Create end-to-end tests to simulate real-world download scenarios, covering the entire flow from API request to file completion.
