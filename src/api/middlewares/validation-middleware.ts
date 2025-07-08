import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/error-handler.js";

const schema = z.object({
  method: z.enum(["direct", "torrent", "magnet"], {
    // biome-ignore lint/style/useNamingConvention: this is the zod api, we don't have control over it
    required_error: "Download method is required.",
  }),
  tags: z
    .array(z.string().min(1, "Tag cannot be empty."))
    .min(1, "At least one tag is required."),
  url: z.string().url("Invalid URL format.").optional(),
});

export const validateDownloadRequest = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      next(
        new AppError(`Invalid request body: ${JSON.stringify(errors)}`, 400),
      );
    } else {
      next(new AppError("An unexpected validation error occurred.", 500));
    }
  }
};
