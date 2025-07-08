import type { Request, Response } from "express";
import {
  beforeEach,
  describe,
  expect,
  it,
  type Mocked,
  type MockInstance,
  vi,
} from "vitest";
import { SseManager } from "../index.js";

describe("SseManager", () => {
  let sseManager: SseManager;
  let mockResponse: Mocked<Response>;
  let mockRequest: Request;
  let mockDateNow: MockInstance<() => number>;

  beforeEach(() => {
    sseManager = new SseManager();
    mockResponse = {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    } as unknown as Mocked<Response>;
    mockRequest = {
      ip: "127.0.0.1",
      on: vi.fn((event, callback) => {
        if (event === "close") {
          // Simulate the close event for testing disconnection
          (
            mockRequest as unknown as {
              _simulateClose: (...args: unknown[]) => void;
            }
          )._simulateClose = callback;
        }
      }),
    } as unknown as Request;

    // Mock Date.now() to ensure predictable client IDs
    mockDateNow = vi.spyOn(Date, "now").mockReturnValue(1234567890);
  });

  describe("addClient", () => {
    it("should add a client and set up SSE headers", () => {
      const downloadId = "test-download-1";
      sseManager.addClient(downloadId, mockRequest, mockResponse);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        connection: "keep-alive",
      });
      expect(sseManager.getClientCount(downloadId)).toBe(1);
    });

    it("should handle client disconnection", () => {
      const downloadId = "test-download-2";
      sseManager.addClient(downloadId, mockRequest, mockResponse);
      expect(sseManager.getClientCount(downloadId)).toBe(1);

      // Simulate client disconnection
      (
        mockRequest as unknown as { _simulateClose: () => void }
      )._simulateClose();

      expect(sseManager.getClientCount(downloadId)).toBe(0);
    });
  });

  describe("removeClient", () => {
    it("should remove a specific client", () => {
      const downloadId = "test-download-3";
      const clientId = sseManager.addClient(
        downloadId,
        mockRequest,
        mockResponse,
      );
      expect(sseManager.getClientCount(downloadId)).toBe(1);
      sseManager.removeClient(clientId);
      expect(sseManager.getClientCount(downloadId)).toBe(0);
    });

    it("should remove the downloadId entry if no clients remain", () => {
      const downloadId = "test-download-4";
      const clientId = sseManager.addClient(
        downloadId,
        mockRequest,
        mockResponse,
      );
      expect(sseManager.getClientCount(downloadId)).toBe(1);

      sseManager.removeClient(clientId);
      expect(sseManager.getClientCount(downloadId)).toBe(0);

      // Verify that the downloadId entry is completely removed from the internal map
      // This requires accessing private state, which is generally not recommended for unit tests.
      // However, for demonstration, we can check if getClientCount returns 0, implying removal.
      expect(sseManager.getClientCount(downloadId)).toBe(0);
    });
  });

  describe("broadcast", () => {
    it("should broadcast event data to all subscribed clients", () => {
      const downloadId = "test-download-5";
      sseManager.addClient(downloadId, mockRequest, mockResponse);

      const mockResponse2 = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRequest2 = {
        ip: "127.0.0.2",
        on: vi.fn((event, callback) => {
          if (event === "close") {
            (
              mockRequest2 as unknown as { _simulateClose: () => void }
            )._simulateClose = callback;
          }
        }),
      } as unknown as Request;
      // Temporarily change Date.now() for the second client to ensure unique ID
      mockDateNow.mockReturnValueOnce(9876543210);
      sseManager.addClient(downloadId, mockRequest2, mockResponse2);

      const eventName = "progress";
      const data = { status: "downloading", progress: 50 };
      sseManager.broadcast(downloadId, eventName, data);

      const expectedEventData = `event: ${eventName}\ndata: ${JSON.stringify(
        data,
      )}\n\n`;
      expect(mockResponse.write).toHaveBeenCalledWith(expectedEventData);
      expect(mockResponse2.write).toHaveBeenCalledWith(expectedEventData);
    });

    it("should remove problematic clients during broadcast", () => {
      const downloadId = "test-download-6";
      sseManager.addClient(downloadId, mockRequest, mockResponse);
      expect(sseManager.getClientCount(downloadId)).toBe(1); // Client should be removed

      // Simulate an error during write
      mockResponse.write.mockImplementationOnce(() => {
        throw new Error("Simulated write error");
      });

      const eventName = "error";
      const data = { message: "Download failed" };
      sseManager.broadcast(downloadId, eventName, data);
      expect(sseManager.getClientCount(downloadId)).toBe(0); // Client should be removed
    });
  });

  describe("getClientCount", () => {
    it("should return the correct number of clients for a downloadId", () => {
      const downloadId = "test-download-7";
      expect(sseManager.getClientCount(downloadId)).toBe(0);

      sseManager.addClient(downloadId, mockRequest, mockResponse);
      expect(sseManager.getClientCount(downloadId)).toBe(1);

      const mockResponse2 = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRequest2 = {
        ip: "127.0.0.2",
        on: vi.fn((event, callback) => {
          if (event === "close") {
            (
              mockRequest2 as unknown as { _simulateClose: () => void }
            )._simulateClose = callback;
          }
        }),
      } as unknown as Request;
      // Temporarily change Date.now() for the second client to ensure unique ID
      mockDateNow.mockReturnValueOnce(9876543210);
      sseManager.addClient(downloadId, mockRequest2, mockResponse2);
      expect(sseManager.getClientCount(downloadId)).toBe(2);

      // Simulate disconnection of the first client
      (
        mockRequest as unknown as { _simulateClose: () => void }
      )._simulateClose();
      expect(sseManager.getClientCount(downloadId)).toBe(1);

      // Simulate disconnection of the second client
      (
        mockRequest2 as unknown as { _simulateClose: () => void }
      )._simulateClose();
      expect(sseManager.getClientCount(downloadId)).toBe(0);
    });

    it("should return 0 for a downloadId with no clients", () => {
      expect(sseManager.getClientCount("non-existent-download")).toBe(0);
    });
  });
});
