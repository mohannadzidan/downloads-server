import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, errorHandler } from "../error-handler.ts";

describe("AppError", () => {
  it("should create an AppError with correct properties", () => {
    const error = new AppError("Test Error", 404);
    expect(error.message).toBe("Test Error");
    expect(error.statusCode).toBe(404);
    expect(error.status).toBe("fail");
    expect(error.isOperational).toBe(true);
  });

  it("should set status to error for 5xx status codes", () => {
    const error = new AppError("Server Error", 500);
    expect(error.status).toBe("error");
  });
});

describe("errorHandler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    process.env.NODE_ENV = "development";
  });

  it("should send a 500 error for operational errors with 5xx status", () => {
    const error = new AppError("Internal Server Error", 500);
    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: "error",
      message: "Internal Server Error",
      error: expect.any(AppError),
      stack: expect.any(String),
    });
  });

  it("should send a 404 error for operational errors with 4xx status", () => {
    const error = new AppError("Not Found", 404);
    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: "fail",
      message: "Not Found",
      error: expect.any(AppError),
      stack: expect.any(String),
    });
  });

  it("should default to 500 if statusCode is not set", () => {
    const error = new Error("Generic Error") as AppError;
    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: "error",
      message: "Generic Error",
      error: expect.any(Error),
      stack: expect.any(String),
    });
  });
});
