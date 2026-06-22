export interface Logger {
  log: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export const getLogger = (reqId: string): Logger => {
  return {
    log: (message: string) => console.log(`[${reqId}] ${message}`),
    warn: (message: string) => console.warn(`[${reqId}] ${message}`),
    error: (message: string) => console.error(`[${reqId}] ${message}`),
  };
};
