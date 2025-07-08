# downloads-server

`downloads-server` is a lightweight, self-hosted application that provides a unified RESTful API for managing internet downloads. It's designed to run on a server, NAS, or any dedicated machine, centralizing your download tasks—from direct HTTP links to torrents and magnet URIs—into a single, easy-to-control interface. With features like real-time progress monitoring via SSE and intelligent volume management for storage, it offers a powerful and flexible solution for automating and organizing your downloads.

## Features

- **Multiple Download Methods:** Supports direct HTTP/HTTPS downloads, torrents, and magnet URIs.
- **Volume Management:** Configurable download volumes with tags, allowing flexible storage allocation based on content type and available space.
- **Real-time Monitoring:** Monitor download progress and status using Server-Sent Events (SSE).
- **Extensible Architecture:** Designed to easily integrate new download methods in the future.

## Why I Developed This Project

Hey there! So, you might be wondering why I poured time into building `downloads-server`. Honestly, it's all about setting myself up for some cool future projects. I've always wanted a super reliable, centralized way to handle all my file downloads, whether it's a direct link, a torrent, or a magnet URI. I envision this project as the backbone for a bunch of ideas I have brewing.

Think of it as my personal download powerhouse. I'm planning to integrate this into various personal automation scripts and applications. For instance, I want to build a custom media management system where this server handles all the heavy lifting of fetching content. Or maybe a personal archiving tool that automatically pulls down articles, videos, or datasets I'm interested in, and organizes them neatly.

Ultimately, `downloads-server` is my answer to having complete control over my digital assets, making sure they land exactly where I want them, efficiently and reliably. It's a foundational piece for a more automated and organized digital life, and I'm excited to see what I'll build on top of it!

## Documentation

- [Project Refinement](docs/project-refinement.md)
- [Config Schema](docs/config-schema.md)
- [Project Architecture](docs/architecture.md)

## Getting Started

To set up and run the `downloads-server` locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mohannadzidan/downloads-server.git
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
