export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }

      const backoff = delayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Operation failed after multiple retries.');
}

