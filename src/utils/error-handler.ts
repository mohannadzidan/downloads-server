import type { NextFunction, Request, Response } from "express";
import logger from "./logger.js";

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  logger.error(err.message, err);

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // In development, send more details
    ...(process.env.NODE_ENV === "development" && {
      error: err,
      stack: err.stack,
    }),
  });
};
