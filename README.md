# downloads-server

`downloads-server` is a lightweight, self-hosted application that provides a unified RESTful API for managing internet downloads. It's designed to run on a server, NAS, or any dedicated machine, centralizing your download tasks—from direct HTTP links to torrents and magnet URIs—into a single, easy-to-control interface. With features like real-time progress monitoring via SSE and intelligent volume management for storage, it offers a powerful and flexible solution for automating and organizing your downloads.

## Features

- **Multiple Download Methods:** Supports direct HTTP/HTTPS downloads, torrents, and magnet URIs.
- **Volume Management:** Configurable download volumes with tags, allowing flexible storage allocation based on content type and available space.
- **Real-time Monitoring:** Monitor download progress and status using Server-Sent Events (SSE).
- **Extensible Architecture:** Designed to easily integrate new download methods in the future.

## Documentation

- [Project Refinement](docs/project-refinement.md)
- [Config Schema](docs/config-schema.md)
- [Project Architecture](docs/architecture.md)

## Getting Started

To set up and run the `downloads-server` locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd downloads-server
    ```

2.  **Install dependencies:**
    This project uses `pnpm`. Make sure you have `pnpm` installed globally. If not, you can install it via npm:
    ```bash
    npm install -g pnpm
    ```
    Then, install the project dependencies:
    ```bash
    pnpm install
    ```

3.  **Configure the server:**
    Create a `config.json` file in the root directory of the project. Refer to the [Config Schema](docs/config-schema.md) for details on the required structure and properties. This file is essential for defining volumes and server settings.

4.  **Run the server in development mode:**
    The project uses `nodemon` (which in turn uses `ts-node`) for running the server in watch mode during development.
    ```bash
    pnpm dev
    ```
    This will start the server, typically on the port specified in your `config.json` (e.g., `http://localhost:3000`).

5.  **Build for production (optional):**
    To build the project for production, you can use:
    ```bash
    pnpm build
    ```
    This will compile the TypeScript code into JavaScript, ready for deployment.

## API Endpoints

The `downloads-server` exposes a RESTful API for managing downloads. see [OpenAPI specs](openapi.yaml)

## Configuration

The `downloads-server` relies on a `config.json` file for its operational settings, including the definition of download volumes and server parameters. This file must be present in the project's root directory.

For a detailed explanation of the `config.json` schema and its properties, please refer to the [Config Schema documentation](docs/config-schema.md).
