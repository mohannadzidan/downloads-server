import winston, { format } from "winston";
import { consoleFormat } from "winston-console-format";

const { combine, timestamp, json } = format;

const logger = winston.createLogger({
  level: "info",
  format: combine(timestamp(), timestamp(), json()),
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.padLevels(),
        consoleFormat({
          showMeta: true,
          metaStrip: ["timestamp", "service"],
          inspectOptions: {
            depth: Infinity,
            colors: true,
            maxArrayLength: Infinity,
            breakLength: 120,
            compact: Infinity,
          },
        }),
      ),
    }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

export default logger;
