import { getLogger } from "./logger";

export interface CachedResponse {
  headers: Record<string, string>;
  value: string;
  expiresAt: number;
}

const cachedResponses: Record<string, CachedResponse> = {};

export const cacheData = (key: string, headers: Record<string, string>, data: string, logger: ReturnType<typeof getLogger>) => {
  try {
    const cacheKey = key;
    const cacheValue = data;
    const ttlSeconds = 120;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    cachedResponses[cacheKey] = { value: cacheValue, headers, expiresAt };
  } catch (error) {
    logger.error(`Failed to cache data for key "${key}": ${(error as Error).message}`);
  }
};

export const getCachedData = (key: string, logger: ReturnType<typeof getLogger>): CachedResponse | null => {
  try {
    const cacheKey = key;
    const cached = cachedResponses[cacheKey];
    if (!cached) {
      return null;
    }
    if (Date.now() > cached.expiresAt) {
      delete cachedResponses[cacheKey];
      return null;
    }
    return cached;
  } catch (error) {
    logger.error(`Failed to retrieve cached data for key "${key}": ${(error as Error).message}`);
    return null;
  }
};