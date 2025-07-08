import * as fs from "node:fs";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TorrentDownloadProvider } from "../torrent-download-provider.js";

const webTorrentMock = {
  callbacks: {} as Record<string, ((...args: unknown[]) => void)[]>,
  torrent: {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!webTorrentMock.callbacks[event]) {
        webTorrentMock.callbacks[event] = [];
      }
      webTorrentMock.callbacks[event].push(cb);
      return webTorrentMock.torrent;
    }),
    remove: vi.fn(),
    downloaded: 1000,
    length: 1000,
    downloadSpeed: 100,
    timeRemaining: 0,
    name: "test-torrent",
    _trigger: (event: string, ...args: unknown[]) => {
      webTorrentMock.callbacks[event]?.forEach((cb) => cb(...args));
    },
  },
  client: {
    add: vi.fn(() => webTorrentMock.torrent),
    remove: vi.fn(),
  },
};
// Mock WebTorrent and its methods
vi.mock("webtorrent", () => {
  return {
    default: class {
      add = webTorrentMock.client.add;
      remove = webTorrentMock.client.remove;
    },
  };
});

// Mock axios for torrent file download
vi.mock("axios", () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({ data: Buffer.from("mock torrent data") }),
    ),
  },
}));

// Mock fs for file system operations
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock path for path operations
vi.mock("path", () => ({
  join: vi.fn((...args) => args.join("/")),
  basename: vi.fn((p) => p.split("/").pop()),
}));

// Mock config for torrentFilesPath
vi.mock("../../../config/index.js", () => ({
  getConfig() {
    return {
      volumes: [
        {
          name: "default-downloads",
          path: "M:/downloads-server-volume",
          maxSizeGb: 100,
          tags: ["general", "media", "json"],
        },
      ],
      server: {
        port: 3000,
        host: "0.0.0.0",
      },
      providers: {
        torrent: {
          downloadTorrentFilesPath: "/.torrents",
        },
      },
    };
  },
}));

describe("TorrentDownloadProvider", () => {
  let provider: TorrentDownloadProvider;
  const onStart = vi.fn();
  const onProgress = vi.fn();
  const onComplete = vi.fn();
  const onError = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    provider = new TorrentDownloadProvider();
    vi.clearAllMocks();
    webTorrentMock.callbacks = {};
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should download torrent file if it does not exist", async () => {
    const torrentUrl = "http://example.com/test.torrent";
    const destinationPath = "/downloads";

    await provider.start(
      torrentUrl,
      destinationPath,
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    expect(axios.get).toHaveBeenCalledWith(torrentUrl, {
      responseType: "arraybuffer",
    });
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.existsSync).toHaveBeenCalledWith(
      "/.torrents/c268e0792c28ec854a3285f592080735c1f718a9bb232a4fd5d6db74f8ce7905.torrent",
    );
  });

  it("should not download torrent file if it already exists", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const torrentUrl = "http://example.com/test.torrent";
    const destinationPath = "/downloads";

    await provider.start(
      torrentUrl,
      destinationPath,
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    expect(axios.get).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should add torrent to webtorrent client", async () => {
    const torrentUrl = "http://example.com/test.torrent";
    const destinationPath = "/downloads";

    await provider.start(
      torrentUrl,
      destinationPath,
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    expect(webTorrentMock.client.add).toHaveBeenCalledWith(
      "/.torrents/c268e0792c28ec854a3285f592080735c1f718a9bb232a4fd5d6db74f8ce7905.torrent",
      { path: destinationPath },
    );
  });

  it("should call onComplete and remove the torrent when torrent finishes downloading", async () => {
    const torrentUrl = "http://example.com/test.torrent";
    const destinationPath = "/downloads";

    await provider.start(
      torrentUrl,
      destinationPath,
      onStart,
      onProgress,
      onComplete,
      onError,
    );
    webTorrentMock.torrent._trigger("done", destinationPath);
    expect(onComplete).toHaveBeenCalledWith();
    expect(webTorrentMock.client.remove).toHaveBeenCalled();
  });

  it("should call onError when torrent encounters an error", async () => {
    const torrentUrl = "http://example.com/test.torrent";
    const destinationPath = "/downloads";

    await provider.start(
      torrentUrl,
      destinationPath,
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    webTorrentMock.torrent._trigger("error");
    expect(onError).toHaveBeenCalledWith(new Error("Torrent Error"));
    expect(webTorrentMock.client.remove).toHaveBeenCalled();
  });

  it("should call onProgress during torrent download", async () => {
    const torrentUrl = "http://example.com/test.torrent";
    const destinationPath = "/downloads";

    await provider.start(
      torrentUrl,
      destinationPath,
      onStart,
      onProgress,
      onComplete,
      onError,
    );

    // Simulate torrent 'download' event
    const mockTorrent = webTorrentMock.torrent;
    mockTorrent._trigger("download");

    expect(onProgress).toHaveBeenCalledWith({
      downloadedBytes: mockTorrent.downloaded,
      totalBytes: mockTorrent.length,
      speed: mockTorrent.downloadSpeed,
      eta: mockTorrent.timeRemaining,
    });
  });

  it("should remove torrent from client on cancel", async () => {
    const torrentUrl = "http://example.com/test.torrent";
    const destinationPath = "/downloads";
    const onStart = vi.fn();

    const cancellationHandle = await provider.start(
      torrentUrl,
      destinationPath,
      onStart,
      onProgress,
      onComplete,
      onError,
    );
    cancellationHandle.cancel();
    expect(webTorrentMock.client.remove).toHaveBeenCalled();
  });

  it("should return 0 for estimated size", async () => {
    const torrentUrl = "http://example.com/test.torrent";
    const estimatedSize = await provider.getEstimatedSize(torrentUrl);
    expect(estimatedSize).toBe(0);
  });
});
