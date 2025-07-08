import {
  createReadStream,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { Server } from "bittorrent-tracker";
import cli from "cli";
import express from "express";
import { ThrottleGroup } from "stream-throttle";
import WebTorrent from "webtorrent";

const { port, trackerPort, directory } = cli.parse({
  directory: ["d", "Folder to serve", "string", "./"],
  port: ["p", "Server port", "number", 3001],
  trackerPort: ["t", "Tracker port", "number", 3002],
});

const app = express();

// In-memory store for seeded files
const cache = new Map();
const client = new WebTorrent({ tracker: false }); // Disable default trackers

client.on("error", (err) => {
  cli.error("WebTorrent client error:", err.message);
});

const tracker = new Server({
  udp: false, // Disable UDP tracker
  http: true, // Enable HTTP tracker
  ws: false, // Disable WebSocket tracker
});

tracker.on("error", (err) => {
  cli.error("Tracker error");
  cli.fatal(err);
});

tracker.on("warning", (err) => {
  cli.error("Tracker warning");
  cli.error(err);
});

tracker.listen(trackerPort, () => {
  cli.info(`Tracker listening on http://localhost:${trackerPort}`);
});

const root = resolve(directory);
// Mount the tracker's HTTP server on a specific path
// app.use(tracker.http..middleware());

app.use(
  "/static",
  (req, res, next) => {
    const filePath = join(root, req.path);
    cli.info(`requesting file ${filePath}`);
    if (!existsSync(filePath)) {
      return res.status(404).send("File not found");
    }
    const stat = statSync(filePath);
    res.set("content-length", stat.size);
    console.log(req.method, "content-length", stat.size);
    if (req.method === "HEAD") {
      res.send("what");
    } else {
      next();
    }
  },
  (req, res, next) => {
    const filePath = join(root, req.path);
    const throttle = Number(req.query.throttle, 10);
    cli.info(`requesting file ${req.path} throttle=${throttle ?? "none"}`);
    if (throttle && throttle > 0) {
      const tg = new ThrottleGroup({ rate: throttle * 1024 }); //1 MiB per sec
      const stream = createReadStream(filePath);
      stream.pipe(tg.throttle()).pipe(res);
    } else {
      express.static(root)(req, res, next);
    }
  },
);

app.get("/seed/*fileName", (req, res) => {
  const { fileName } = req.params;
  const filePath = join(root, ...fileName);
  const throttle = parseInt(req.query.throttle, 10);

  if (throttle && throttle > 0) {
    // Set global upload limit for WebTorrent client in bytes/second
    client.throttleUpload(throttle * 1024);
    cli.info(`WebTorrent client upload limit set to ${throttle} KiB/s`);
  } else {
    client.uploadLimit = -1; // Unlimited upload
    cli.info("WebTorrent client upload limit set to unlimited");
  }

  if (cache.has(filePath)) {
    const data = cache.get(filePath);
    return res.status(200).json(data);
  }

  cache.set(filePath, {
    status: "pending",
    message:
      "the file(s) currently being prepared for seeding, please try again later",
  });

  client.seed(
    filePath,
    { announce: [`http://localhost:${trackerPort}/announce`] },
    (torrent) => {
      // To keep the torrent alive and seeding, we need to store it.
      // We'll use the file path as a key to prevent re-seeding the same file.
      const magnetUri = torrent.magnetURI;

      // Save the .torrent file
      const torrentsDir = join(process.cwd(), "torrents");

      const torrentFilePath = join(torrentsDir, `${torrent.infoHash}.torrent`);
      const torrentFileUrl = `http://${"localhost"}:${port}/torrent/${
        torrent.infoHash
      }.torrent`;

      if (!existsSync(torrentsDir)) {
        mkdirSync(torrentsDir);
      }
      writeFileSync(torrentFilePath, torrent.torrentFile);
      const result = {
        magnetURI: magnetUri,
        torrentFile: `/torrent/${torrent.infoHash}.torrent`,
        torrentFileUrl,
      };
      cache.set(filePath, result);
      cli.info(`Seeding ${fileName} with magnet: ${magnetUri}`);
      cli.info(`Torrent file saved to ${torrentFilePath}`);
      cli.info(`You can download the file from the url ${torrentFileUrl}`);
      res.status(200).json(result);
    },
  );
});

app.get("/torrent/:infoHash.torrent", (req, res) => {
  const { infoHash } = req.params;
  const torrentFilePath = join(
    process.cwd(),
    "torrents",
    `${infoHash}.torrent`,
  );

  if (existsSync(torrentFilePath)) {
    res.download(torrentFilePath);
  } else {
    res.status(404).send("Torrent file not found");
  }
});

const server = app.listen(port, () => {
  cli.info(`Test file server listening at http://localhost:${port}`);
});

function shutdown() {
  cli.info("SIGTERM signal received: closing HTTP server");
  server.closeAllConnections();
  server.close((err) => {
    if (err) {
      cli.error(err);
    }
    cli.info("HTTP server closed");
    client.destroy((err) => {
      if (err) {
        cli.error(err);
      }
      cli.info("WebTorrent client destroyed");
      tracker.close(() => {
        cli.info("BitTorrent tracker closed");
        process.exit(0);
      });
    });
  });
}
// Handle graceful shutdown
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
