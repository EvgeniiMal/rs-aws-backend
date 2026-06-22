import { responseHeaders } from "./headers";
import { getLogger } from "./logger";

export const sendBadGatewayResponse = (res: any, logger: ReturnType<typeof getLogger>, message: string) => {
  logger.warn(message);
  if (!res.headersSent) {
    res.writeHead(502, responseHeaders);
    res.write(JSON.stringify({ error: 'Bad Gateway' }));
  }
  res.end();
};
