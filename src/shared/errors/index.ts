export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_ERROR",
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` (${id})` : ""} not found`,
      404,
      "NOT_FOUND"
    );
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", details);
    this.name = "ConflictError";
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, field?: string) {
    super(
      `Duplicate ${resource}${field ? ` for ${field}` : ""}`,
      409,
      "DUPLICATE"
    );
    this.name = "DuplicateError";
  }
}

export function toApiError(error: unknown): {
  status: number;
  body: { type: string; title: string; status: number; detail?: string; instance?: string };
} {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        type: `urn:pak-tele-health:error:${error.code.toLowerCase()}`,
        title: error.name,
        status: error.statusCode,
        detail: error.message,
      },
    };
  }

  // Don't leak internal errors
  return {
    status: 500,
    body: {
      type: "urn:pak-tele-health:error:internal",
      title: "Internal Server Error",
      status: 500,
    },
  };
}
