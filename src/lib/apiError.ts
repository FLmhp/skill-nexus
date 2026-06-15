export function toUserError(error: unknown): string {
  if (error instanceof Error) {
    logError(error);
    return error.message || "Unexpected application error";
  }

  if (typeof error === "string") {
    logError(error);
    return error;
  }

  if (error && typeof error === "object") {
    logError(error);
    const maybeMessage = "message" in error ? error.message : null;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  logError(error);
  return "Operation failed. Please try again.";
}

function logError(error: unknown) {
  if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
    console.error(error);
  }
}
