# `config.json` Schema

This document details the schema for the `config.json` file, which is crucial for configuring the `downloads-server`.

This file defines essential operational parameters, including the setup of `volumes`—designated storage locations for downloaded content—and server-specific settings. The `downloads-server` relies on this configuration to manage download processes and allocate storage efficiently.

```json
{
  "volumes": [
    {
      "name": "string",
      "path": "string",
      "maxSizeGB": "number",
      "tags": ["string"]
    }
  ],
  "server": {
    "port": "number",
    "host": "string"
  },
  "providers": {
    "torrent": {
      "downloadTorrentFilesPath": "string"
    }
  }
}
```

## Top-Level Properties

- **`volumes`**: An array of objects, each representing a download volume configuration. This is where you define the storage locations for your downloads.
- **`server`**: An object containing server-specific configurations, such as the port and host address for the API.

## `volumes` Array Object Properties

- **`name`** (string, **required**): A unique identifier for the volume (e.g., "primary-downloads"). Must not be empty.
- **`path`** (string, **required**): The absolute path to the directory where files will be downloaded for this volume (e.g., "/mnt/data/downloads"). Must not be empty.
- **`maxSizeGB`** (number, **required**): The maximum size, in gigabytes, that this volume can occupy. This value should not exceed the physical capacity of the underlying storage. Must be a positive number.
- **`tags`** (array of strings, **required**): An array of tags associated with this volume. Download requests will specify a tag, and the server will attempt to download the content into a volume that matches one of the specified tags and has sufficient space. Each tag must not be empty, and at least one tag is required for a volume.

## `server` Object Properties

- **`port`** (number, **required**): The port number on which the download server will listen for incoming API requests (e.g., `3000`). Must be a positive integer between 1024 and 65535.
- **`host`** (string, **required**): The host address on which the download server will bind (e.g., `0.0.0.0` for all network interfaces, `127.0.0.1` for localhost only). Must not be empty.

## `providers` Object Properties

- **`torrent`** (object, **required**): An object containing configurations for the torrent provider.

### `torrent` Object Properties

- **`downloadTorrentFilesPath`** (string, **required**): The absolute path to the directory where torrent files will be stored. Must not be empty.

## Validation

The `config.json` file is validated against a Zod schema at application startup. The server will not start if the configuration is invalid. Key validation rules include:

- At least one volume must be configured.
- Volume names and paths cannot be empty.
- `maxSizeGB` must be a positive number.
- Each volume must have at least one tag, and tags cannot be empty.
- The server port must be a positive integer between 1024 and 65535.
- The server host cannot be empty.

## Example `config.json`

```json
{
  "volumes": [
    {
      "name": "primary-downloads",
      "path": "/path/to/primary/volume",
      "maxSizeGB": 500,
      "tags": ["movies", "series", "documents"]
    },
    {
      "name": "secondary-downloads",
      "path": "/path/to/secondary/volume",
      "maxSizeGB": 200,
      "tags": ["software", "games"]
    }
  ],
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "providers": {
    "torrent": {
      "downloadTorrentFilesPath": "/path/to/torrent/files"
    }
  }
}
```
